const _ = require('lodash');

const {
  findModel,
  isContentManagerUrl,
  isDeleteAllUrl,
  findImportExportModel,
  getDeleteIds,
  checkRequest,
} = require('./helper');

/**
 *
 * @param {string} models
 * @param {string} url
 * @returns {null| Object}
 */
const findTargetModel = async (models, url, importExportBody) => {
  let targetModel;

  targetModel = await isContentManagerUrl({ models, reqUrl: url });

  if (!targetModel) {
    targetModel = await isDeleteAllUrl({ models, reqUrl: url });
  }

  if (!targetModel) {
    targetModel = await findModel({ models, reqUrl: url });
  }

  if(!targetModel) {
    targetModel = await findImportExportModel({ models, reqUrl: url, importExportBody });
  }

  return targetModel;
};

/**
 *
 * @param {string} url request url
 * @param {object} body request body
 * @param {object} targetModel model config in elasticsearch config file
 * @param {number|string} id record primary key
 */
const deleteData = async (url, body, targetModel, id) => {
  let deleteIds;

  deleteIds = await getDeleteIds({ reqUrl: url, body: body });

  const id_in = !_.isEmpty(deleteIds) ? deleteIds : [id];

  if (_.isEmpty(id_in)) return;
  await strapi.elastic.destroy(targetModel.model, { id_in });
};

/**
 *
 * @param {object} body request body
 * @param {object} targetModel model config in elasticsearch config file
 * @param {*} id record primary key
 */
const createOrUpdateData = async (body, targetModel, id) => {
  let data;
  data = targetModel.fillByResponse ? body : null;

  if (!data) {
    data = await strapi
      .query(targetModel.model, targetModel.plugin)
      .findOne({ id, ...targetModel.conditions }, [
        ...targetModel.relations,
        'created_by',
        'updated_by',
      ]);
  }

  if (!data || !id) return;

  await strapi.elastic.createOrUpdate(targetModel.model, { id, data });
};

module.exports = {
  /**
   * Intercepts all requests and checks if an action needs to be taken
   * 
   * @param {Object} ctx request context
   */
  elasticsearchManager: async (ctx) => {
    const isValidReq = checkRequest(ctx);
    if (!isValidReq) return;

    const { url, method } = ctx.request;
    const { body } = ctx;
    const importExportBody = ctx.request.body;
    const { models } = strapi.config.elasticsearch;

    const targetModel = await findTargetModel(models, url, importExportBody);
    if (!targetModel) return; 

    // set default value
    targetModel.fillByResponse = _.isBoolean(targetModel.fillByResponse)
      ? targetModel.fillByResponse
      : true;
    const pk = targetModel.pk || 'id';

    const { id } =
      _.pick(body, pk) || _.pick(ctx.params, pk) || _.pick(ctx.query, pk);

    const isPostOrPutMethod = method === 'POST' || method === 'PUT';
    const isDeleteMethod = ctx.request.method === 'DELETE' || isPostOrPutMethod && _.last(ctx.path.split('/')) == 'bulkDelete';

    if (isDeleteMethod) {
      await deleteData(url, body, targetModel, id);
    } else if (isPostOrPutMethod) {
      if(ctx._matchedRoute === '/import-export-content/import') {
        await strapi.elastic.bulkCreateOrUpdate(targetModel.model, body.results);
      } else {
        await createOrUpdateData(body, targetModel, id);
      }
    }
  },
};
