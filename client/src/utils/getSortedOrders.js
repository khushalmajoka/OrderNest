export const getSortedOrders = (orders, sortField, sortOrder) => {
  if (!sortField) return orders;

  return [...orders].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];

    if (typeof valA === "number" && typeof valB === "number") {
      return sortOrder === "asc" ? valA - valB : valB - valA;
    }

    const strA = valA?.toString().toLowerCase();
    const strB = valB?.toString().toLowerCase();
    return sortOrder === "asc" ? (strA > strB ? 1 : -1) : (strA < strB ? 1 : -1);
  });
};
