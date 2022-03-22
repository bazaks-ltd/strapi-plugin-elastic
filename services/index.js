const {
  bulkCreateOrUpdate,
  createOrUpdate,
  destroy,
  find,
  findOne,
  migrateById,
  migrateModel,
  migrateModels,
} = require('./functions');

const { elasticsearchManager } = require('./middleware');

const logger = require('./logger');

const helper = require('./helper');

module.exports = {
  createOrUpdate,
  bulkCreateOrUpdate,
  find,
  destroy,
  elasticsearchManager,
  findOne,
  migrateById,
  migrateModel,
  migrateModels,
  logger,
  helper,
};
