/* ===================== *

* ====================== */
$("#get-the-news").on("click",function(event) {
  // Empty the notes from the articles section
  $("articles").empty();

  // Make the Ajax call to clear the articles from the database
  $.ajax({
    method: "GET",
    url: "/cleararticles/"
  })
  .then(function(data) {
    console.log(data);  // log the response

    // Make the Ajax call to get new articles and save them to the data base
    $.ajax({
      method: "GET",
      url: "/scrape/"
    })
    .then(function(data) {
      console.log(data);  // log the response
      
      // Make the Ajax call to to real all the articles that show them on the screen
      $.ajax({
        method: "GET",
        url: "/all/"
      })
      .then(function(data) {
        console.log(data);  // log the response
      }); 
    });
  });
});
/* ==================== *
 * Articles
 * front-end
 * ==================== */

 // Grab the articles as a json
$.getJSON("/articles", function(data) {
  // For each one
  for (var i = 0; i < data.length; i++) {
    // Display the apropos information on the page
    $("#articles").append("<p data-id='" + data[i]._id + "'>"
                                       + "<strong>" + data[i].title +  "<br /></strong>"
                                       + data[i].summary + "<br />");
//                                       + data[i].link + "</p>");
  }
});

// Whenever someone clicks a p tag
$(document).on("click", "p", function() {
  // Empty the notes from the note section
  $("#notes").empty();
  // Save the id from the p tag
  var thisId = $(this).attr("data-id");

  // Now make an ajax call for the Article
  $.ajax({
    method: "GET",
    url: "/articles/" + thisId
  })
    // With that done, add the note information to the page
    .then(function(data) {
      console.log(data);
      // The title of the article
      $("#notes").append("<h2>" + data.title + "</h2>");
      // The summary of the article
      $("#notes").append("<h3>" + data.summary + "</h3>");
      // The link to the full article
      $("#notes").append("<a " + "href='" + data.link + "'>See the full article</a><br /><br />");
          
     // An input to enter a new note title
      $("#notes").append("<label>Title</label>");
      $("#notes").append("<input id='titleinput' name='title' ><br />");

      // A textarea to add a new note body  
      $("#notes").append("<label>Comment</label>");
      $("#notes").append("<textarea id='bodyinput' name='body'></textarea><br \>");
      // A button to submit a new note, with the id of the article saved to it
      $("#notes").append("<button data-id='" + data._id + "' id='savenote'>Save Note</button>");

      // If there's a note in the article
      if (data.note) {
        // Place the title of the note in the title input
        $("#titleinput").val(data.note.title);
        // Place the body of the note in the body textarea
        $("#bodyinput").val(data.note.body);
      }
    });
});

// When you click the savenote button
$(document).on("click", "#savenote", function() {
  // Grab the id associated with the article from the submit button
  var thisId = $(this).attr("data-id");

  // Run a POST request to change the note, using what's entered in the inputs
  $.ajax({
    method: "POST",
    url: "/articles/" + thisId,
    data: {
      // Value taken from title input
      title: $("#titleinput").val(),
      // Value taken from summary input
      summary: $("#summaryinput").val(),
      // Value taken from note textarea
      body: $("#bodyinput").val()
    }
  })
  // With that done
  .then(function(data) {
      // Log the response
      console.log(data);
      // Empty the notes section
      $("#notes").empty();
  });

  // Also, remove the values entered in the input and textarea for note entry
  $("#titleinput").val("");
  $("#summaryinput").val("");
  $("#bodyinput").val("");
});
