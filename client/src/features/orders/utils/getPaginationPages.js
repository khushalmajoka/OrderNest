export const getPaginationPages = (totalOrders, ordersPerPage, currentPage, maxVisible = 5) => {
  const totalPages = Math.ceil(totalOrders / ordersPerPage);
  const pages = [];

  if (totalPages <= maxVisible) {
    for (let i = 0; i < totalPages; i++) pages.push(i);
  } else {
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages, start + maxVisible);

    if (start > 0) pages.push("start-ellipsis");
    for (let i = start; i < end; i++) pages.push(i);
    if (end < totalPages) pages.push("end-ellipsis");
  }

  return pages;
};