/**
 * Runs a paginated Mongoose query and returns data + pagination metadata.
 * @param {import('mongoose').Model} Model
 * @param {object} filter
 * @param {object} options - { page, limit, sortBy, sortOrder, populate, select }
 */
const paginate = async (Model, filter, options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
  const skip = (page - 1) * limit;
  const sort = { [options.sortBy || "createdAt"]: options.sortOrder === "asc" ? 1 : -1 };

  let query = Model.find(filter).sort(sort).skip(skip).limit(limit);
  if (options.populate) query = query.populate(options.populate);
  if (options.select) query = query.select(options.select);

  const [data, total] = await Promise.all([query.lean(), Model.countDocuments(filter)]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
};

export default paginate;
