import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendResponse } from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';
import { Category } from '../../database/index.js';

export const listCategories = asyncHandler(async (req, res) => {
  const { all } = req.query;
  const filter = all === 'true' ? {} : { isActive: true };
  const categories = await Category.find(filter).sort({ name: 1 });
  return sendResponse(res, 200, 'Categories retrieved', categories);
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) throw ApiError.badRequest('Category name is required');

  const existing = await Category.findOne({ name: name.trim() });
  if (existing) throw ApiError.conflict('A category with this name already exists');

  const category = await Category.create({
    name: name.trim(),
    description: description ? description.trim() : '',
    isActive: true,
  });

  return sendResponse(res, 201, 'Category created successfully', category);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const { name, description, isActive } = req.body;

  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.notFound('Category not found');

  if (name !== undefined) category.name = name.trim();
  if (description !== undefined) category.description = description.trim();
  if (isActive !== undefined) category.isActive = Boolean(isActive);

  await category.save();

  return sendResponse(res, 200, 'Category updated successfully', category);
});
