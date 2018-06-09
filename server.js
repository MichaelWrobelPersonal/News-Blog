// Dependencies
var express = require("express");
var mongojs = require("mongojs");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var axios = require("axios");
var cheerio = require('cheerio');

// Project files
var db = require("./models");
//var route = require("./routes");

// Other 
var PORT = 3000;

// Initialize
var app = express();

// Set the app up with morgan.
// morgan is used to log our HTTP Requests. By setting morgan to 'dev'
// the :status token will be colored red for server error codes,
// yellow for client error codes, cyan for redirection codes,
// and uncolored for all other codes.
app.use(logger("dev"));
// Setup the app with body-parser and a static folder
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);
app.use(express.static("public"));

// Import routes
var routes = require("./routes");

// Database configuration
var databaseUrl = process.env.MONGODB_URI || 'mongodb://localhost/MongoHeadlines';
var collections = ["articles","notes"];

mongoose.Promise = Promise;
mongoose.connect(databaseUrl);

// Hook mongojs config to db variable
var dbs = null;
if(process.env.MONGODB_URI) {
    dbs = mongojs(process.env.MONGODB_URI, collections);
}
else // local connection
{ 
    dbs = mongojs(databaseUrl, collections);  
}

// Log any mongojs errors to console
dbs.on("error", function(error) {
  console.log("Database Error:", error);
});

dbs.once('open', function() {
  console.log('mongooose connection sucessful.');
});

// Routes
// ======

// Simple index route
app.get("/", function(req, res) {
  res.send(index.html);
});

// Article Routes
// A GET route for scraping the echoJS website
app.get("/scrape", function(req, res) {
  // First, we grab the body of the html with request
  axios.get("http://www.newsweek.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
  //  console.log("Newsweek response data: " +response.data)
    var $ = cheerio.load(response.data);

    // Now, we grab every article tag, and do the following:
    $("article").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .children("h3")
        .text();
      result.summary =$(this)
        .children("div.summary")
        .text();
      
      result.link = "http://www.newsweek.com" + $(this)
        .children('h3').children('a')
        .attr('href');

    // console.log("cheerio result...\n   title: " + result.title + "\n   summary: " + result.summary + "\n    link: " + result.link)

      // Toss out any empty articles
      if (result.title != "")
      {
      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function(dbArticle) {
          // View the added result in the console
          console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          return res.json(err);
        });
      }
    });

    // If we were able to successfully scrape and save an Article, send a message to the client
    res.send("Scrape Complete");
  });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
  // Grab every document in the Articles collection
  db.Article.find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("note")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Note.create(req.body)
    .then(function(dbNote) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.json(dbArticle);
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


// Blog Routes

// Handle form submission, save submission to mongo
app.post("/submit", function(req, res) {
  console.log(req.body);
  // Insert the note into the notes collection
  dbs.notes.insert(req.body, function(error, saved) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      // Otherwise, send the note back to the browser
      // This will fire off the success function of the ajax request
      res.send(saved);
    }
  });
});

// Retrieve results from mongo
app.get("/all", function(req, res) {
  // Find all notes in the notes collection
  dbs.notes.find({}, function(error, found) {
    // Log any errors
    if (error) {
      console.log(error);
    }
    else {
      // Otherwise, send json of the notes back to user
      // This will fire off the success function of the ajax request
      res.json(found);
    }
  });
});

// Select just one note by an id
app.get("/find/:id", function(req, res) {
  // When searching by an id, the id needs to be passed in
  // as (mongojs.ObjectId(IdYouWantToFind))

  // Find just one result in the notes collection
  dbs.notes.findOne(
    {
      // Using the id in the url
      _id: mongojs.ObjectId(req.params.id)
    },
    function(error, found) {
      // log any errors
      if (error) {
        console.log(error);
        res.send(error);
      }
      else {
        // Otherwise, send the note to the browser
        // This will fire off the success function of the ajax request
        console.log(found);
        res.send(found);
      }
    }
  );
});

// Update just one note by an id
app.post("/update/:id", function(req, res) {
  // When searching by an id, the id needs to be passed in
  // as (mongojs.ObjectId(IdYouWantToFind))

  // Update the note that matches the object id
  dbs.notes.update(
    {
      _id: mongojs.ObjectId(req.params.id)
    },
    {
      // Set the title, note and modified parameters
      // sent in the req body.
      $set: {
        title: req.body.title,
        note: req.body.note,
        modified: Date.now()
      }
    },
    function(error, edited) {
      // Log any errors from mongojs
      if (error) {
        console.log(error);
        res.send(error);
      }
      else {
        // Otherwise, send the mongojs response to the browser
        // This will fire off the success function of the ajax request
        console.log(edited);
        res.send(edited);
      }
    }
  );
});

// Delete One from the DB
app.get("/delete/:id", function(req, res) {
  // Remove a note using the objectID
  dbs.notes.remove(
    {
      _id: mongojs.ObjectID(req.params.id)
    },
    function(error, removed) {
      // Log any errors from mongojs
      if (error) {
        console.log(error);
        res.send(error);
      }
      else {
        // Otherwise, send the mongojs response to the browser
        // This will fire off the success function of the ajax request
        console.log(removed);
        res.send(removed);
      }
    }
  );
});

// Clear the DB
app.get("/cleararticles", function(req, res) {

  // Remove every note from the Articles collection
  dbs.articles.remove({}, function(error, response) {
     // Log any errors to the console
     if (error) {
       console.log(error);
       res.send(error);
     }
     else {
       // Otherwise, send the mongojs response to the browser
       // This will fire off the success function of the ajax request
       console.log(response);
       res.send(response);
     }
  });
});

 
// Clear the DB
app.get("/clearnotes", function(req, res) {

   // Remove every note from the notes collection
   dbs.notes.remove({}, function(err, reply) {
     // Log any errors to the console
     if (err) {
       console.log(err);
       res.send(err);
     }
     else {
       // Otherwise, send the mongojs response to the browser
       // This will fire off the success function of the ajax request
       console.log(reply);
       res.send(reply);
     }
  });
});
 

// Clear the DB
app.get("/clearall", function(req, res) {

 // Remove every note from the Articles collection
  dbs.articles.remove({}, function(error, response) {
    // Log any errors to the console
    if (error) {
      console.log(error);
      res.send(error);
    }
    else {
      // Otherwise, send the mongojs response to the browser
      // This will fire off the success function of the ajax request
      console.log(response);
      res.send(response);
    }
  });

  // Remove every note from the notes collection
  dbs.notes.remove({}, function(err, reply) {
    // Log any errors to the console
    if (err) {
      console.log(err);
      res.send(err);
    }
    else {
      // Otherwise, send the mongojs response to the browser
      // This will fire off the success function of the ajax request
      console.log(reply);
      res.send(reply);
    }
  });
});

// Listen on port 3000
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});
