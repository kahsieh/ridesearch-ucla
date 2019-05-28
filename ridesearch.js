/*
RideSearch for UCLA
ridesearch.js

Copyright (c) 2019 Kevin Hsieh. All Rights Reserved.
*/

// -----------------------------------------------------------------------------
// GLOBALS
// -----------------------------------------------------------------------------

const app = {
  version: "v0.1.2",
  update_api: "https://api.github.com/repos/kahsieh/ridesearch-ucla/releases/latest"
};

let userID = null;
let posts = [];

// -----------------------------------------------------------------------------
// UTILITIES
// -----------------------------------------------------------------------------

function id(str) {
  return document.getElementById(str);
}

// Get the ride dates of a post, as determined by the presence of keywords.
function rideDates(post) {
  let date = new Date(post.updated_time);
  times = new Set();

  // Today
  const kws_today = ["today", "tonight"];
  if (kws_today.some(post.includes)) {
    times.add(date.getTime());
  }

  // Dates
  const formats = [
    {month: "long", day: "numeric"},
    {month: "short", day: "numeric"},
    {month: "numeric", day: "numeric"}
  ];
  let kws_dates = {};
  for (let i = 0; i < 14; ++i) {
    let nd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
    for (const format of formats) {
      kws_dates[nd.toLocaleString("en-us", format)] = i;
    }
  }
  let date_found = false;
  for (const keyword of Object.keys(kws_dates)) {
    if (post.includes(keyword)) {
      date_found = true;
      times.add(new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + kws_dates[keyword]
      ).getTime());
    }
  }

  // Days (only if no dates)
  const kws_days = {
    "sun": 0,
    "mon": 1,
    "tue": 2,
    "wed": 3,
    "thu": 4,
    "fri": 5,
    "sat": 6
  };
  if (!date_found) {
    for (const keyword of Object.keys(kws_days)) {
      if (post.includes(keyword)) {
        times.add(new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate() + (kws_days[keyword] - date.getDay() + 7) % 7
        ).getTime());
      }
    }
  }

  return Array.from(times).sort().map(time => new Date(time));
}

// -----------------------------------------------------------------------------
// APPLICATION
// -----------------------------------------------------------------------------

addEventListener("load", () => {
  id("app-version").innerText = app.version;
  let req = new XMLHttpRequest();
  req.open("GET", app.update_api);
  req.onreadystatechange = () => {
    if (!(req.readyState == 4 && (!req.status || req.status == 200))) {
      return;
    }
    const res = JSON.check(req.responseText);
    if (res.tag_name && res.tag_name > tag) {
      id("update-bar").classList.remove("hide");
      id("update-link").href = res.html_url;
    }
  }
  req.send();
});

// Facebook initializer.
window.fbAsyncInit = () => {
  FB.init({
    appId: "1629026357232795",
    version: "v3.3"
  });
  FB.AppEvents.logPageView();
  FB.Event.subscribe('xfbml.render', () => id("spinner").classList.add("hide"));
  main();
};

// Check for authentication. Calls load() if successful.
function main() {
  FB.getLoginStatus(response => {
    if (response.status == "connected") {
      userID = response.authResponse.userID;
      console.log("Acquired token: " + response.authResponse.accessToken)
      id("login_msg").classList.add("hide");
      load();
    }
    else {
      id("login_msg").classList.remove("hide");
      posts = [];
      display();
    }
  });
}

// Load, preprocess, and display posts from group.
function load() {
  id("loading_msg").classList.remove("hide");
  FB.api(`/${id("group").value}/feed?limit=100`, response => {
    if (response && !response.error && response.data) {
      console.log(`Loaded ${response.data.length} posts`);
      posts = response.data.filter(
        post => post.updated_time && post.message && post.id);
    }
    else if (userID == test_userID && id("group").value == test_groupID) {
      // Test user, test group
      posts = test_posts;
    }
    else if (id("group").value == test_groupID2) {
      // Real user, test group
      posts = test_posts2;
    }
    else {
      posts = [];
    }
    for (let post of posts) {
      post.includes = kw =>
        post.message.toLowerCase().includes(kw.toLowerCase());
      post.open = _ => {
        let id = post.id.split("_");
        window.open(`https://www.facebook.com/${id[0]}/posts/${id[1]}`);
      };
      post.rideDates = rideDates(post);
    }
    display();
    id("loading_msg").classList.add("hide");
  });
}

// Display posts satisfying selected filters.
function display() {
  id("posts").innerHTML = "";
  for (const post of posts) {
    if (check(post)) {
      let row = id("posts").insertRow();
      row.className = "clickable";
      row.onclick = post.open;
      row.insertCell().innerHTML = post.rideDates
        .map(date => date.toLocaleDateString("en-US")).join("<br>");
      row.insertCell().innerHTML = post.message +
        `<div class="small grey-text">Updated ` +
        new Date(post.updated_time).toLocaleString("en-US") + "</div>";
    }
  }
}

// Check if post satisfies selected filters.
function check(post) {
  // Desired type.
  let dtype = id("type").value;
  // Actual type, as determined by the presence of keywords.
  const kws_looking = ["looking", "anyone"];
  let gtype = kws_looking.some(post.includes) ? "looking" : "driving";
  if (dtype != gtype) {
    return false;
  }

  // Desired date.
  let ddate = null;
  if (id("date").value != "") {
    let parts = id("date").value.split("/");
    ddate = new Date(parts[2], parts[0] - 1, parts[1]);
  }
  // Actual date(s).
  let gdates = post.rideDates;
  if (ddate && gdates.every(date => date.getTime() != ddate.getTime())) {
    return false;
  }

  // Desired keywords.
  let keywords = id("keywords").value.split(" ");
  // Actual keywords.
  if (!keywords.every(post.includes)) {
    return false;
  }

  return true;
}

// -----------------------------------------------------------------------------
// TESTING
// -----------------------------------------------------------------------------

const test_userID = "106825647186095";
const test_groupID = "480950945776423";
const test_posts = JSON.parse("[{\"message\":\"Driving UCLA -> San Diego (north county) on Friday 5/24 at 8pm. 2 spots $20 each. Message me if interested\",\"updated_time\":\"2019-05-22T21:22:54+0000\",\"id\":\"480950945776423_498916480646536\",\"rideDates\":[\"2019-05-24T07:00:00.000Z\"]},{\"message\":\"looking for UCLA -> UCI (05/23) Thursday before 9:30 AM!\",\"updated_time\":\"2019-05-22T21:21:34+0000\",\"id\":\"480950945776423_498916450646539\",\"rideDates\":[\"2019-05-23T07:00:00.000Z\"]},{\"message\":\"Looking for UCLA-> Riverside sat morning 5/25!\",\"updated_time\":\"2019-05-22T21:21:25+0000\",\"id\":\"480950945776423_498916420646542\",\"rideDates\":[\"2019-05-25T07:00:00.000Z\"]},{\"message\":\"DRIVING: UCLA --> UCSD $15 FRIDAY 6PM\\n\\nCan leave anytime after 4:00PM, but depends on traffic\",\"updated_time\":\"2019-05-22T21:21:07+0000\",\"id\":\"480950945776423_498916397313211\",\"rideDates\":[\"2019-05-24T07:00:00.000Z\"]},{\"message\":\"DRIVING: UCLA --> SD (UTC), Thursday Night.\\n\\nMessage me if interested.\",\"updated_time\":\"2019-05-22T21:20:57+0000\",\"id\":\"480950945776423_498916353979882\",\"rideDates\":[\"2019-05-23T07:00:00.000Z\"]}]");

const test_groupID2 = "2309901852625556";
const test_posts2 = JSON.parse("[{\"message\":\"Driving UCLA -> San Diego (north county) on Friday 5/24 at 8pm. 2 spots $20 each. Message me if interested\",\"updated_time\":\"2019-05-22T21:22:54+0000\",\"id\":\"2309901852625556_2309902922625449\",\"rideDates\":[\"2019-05-24T07:00:00.000Z\"]},{\"message\":\"looking for UCLA -> UCI (05/23) Thursday before 9:30 AM!\",\"updated_time\":\"2019-05-22T21:21:34+0000\",\"id\":\"2309901852625556_2309902449292163\",\"rideDates\":[\"2019-05-23T07:00:00.000Z\"]},{\"message\":\"Looking for UCLA-> Riverside sat morning 5/25!\",\"updated_time\":\"2019-05-22T21:21:25+0000\",\"id\":\"2309901852625556_2309902382625503\",\"rideDates\":[\"2019-05-25T07:00:00.000Z\"]},{\"message\":\"DRIVING: UCLA --> UCSD $15 FRIDAY 6PM\\n\\nCan leave anytime after 4:00PM, but depends on traffic\",\"updated_time\":\"2019-05-22T21:21:07+0000\",\"id\":\"2309901852625556_2309902275958847\",\"rideDates\":[\"2019-05-24T07:00:00.000Z\"]},{\"message\":\"DRIVING: UCLA --> SD (UTC), Thursday Night.\\n\\nMessage me if interested.\",\"updated_time\":\"2019-05-22T21:20:57+0000\",\"id\":\"2309901852625556_2309902205958854\",\"rideDates\":[\"2019-05-23T07:00:00.000Z\"]}]");
