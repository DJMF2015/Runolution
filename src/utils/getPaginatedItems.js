export const getPaginatedItems = (items = [], currentPage = 1, itemsPerPage = 20) => {
  const safeItems = Array.isArray(items) ? items : [];
  const safeItemsPerPage = Math.max(Number(itemsPerPage) || 1, 1);
  const totalPages = Math.ceil(safeItems.length / safeItemsPerPage);
  const safeCurrentPage = Math.min(
    Math.max(Number(currentPage) || 1, 1),
    totalPages || 1,
  );
  const startIndex = (safeCurrentPage - 1) * safeItemsPerPage;

  return {
    paginatedItems: safeItems.slice(startIndex, startIndex + safeItemsPerPage),
    totalPages,
    currentPage: safeCurrentPage,
  };
};
