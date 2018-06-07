// Exporting an object containing all of our routes
module.exports = {
  Blog: require("./blog-api-routes.js"),
  News: require("./news-scrape-api-routes.js")
};
