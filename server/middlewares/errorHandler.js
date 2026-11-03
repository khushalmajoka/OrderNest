// filepath: server/middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  // Full error stays in server logs only
  console.error(`${req.method} ${req.originalUrl} ->`, err.stack || err);

  let status = err.status || 500;
  let message = "Something went wrong. Please try again.";

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID or value provided.";
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate value: this record already exists.";
  } else if (status < 500 && err.message) {
    // Errors we threw on purpose with a 4xx status are safe to show
    message = err.message;
  }

  res.status(status).json({ success: false, message });
}
module.exports = errorHandler;
