/*
RideSearch for UCLA
ridesearch.js

Copyright (c) 2019 Kevin Hsieh. All Rights Reserved.
*/

// -----------------------------------------------------------------------------
// GLOBALS
// -----------------------------------------------------------------------------

const app = {
  version: "v0.1.0",
  update_api: "https://api.github.com/repos/kahsieh/ridesearch-ucla/releases/latest"
};

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

  // Days
  const kws_days = {
    "sun": 0,
    "mon": 1,
    "tue": 2,
    "wed": 3,
    "thu": 4,
    "fri": 5,
    "sat": 6
  };
  for (const keyword of Object.keys(kws_days)) {
    if (post.includes(keyword)) {
      times.add(new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + (kws_days[keyword] - date.getDay() + 7) % 7
      ).getTime());
    }
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
  for (const keyword of Object.keys(kws_dates)) {
    if (post.includes(keyword)) {
      times.add(new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() + kws_dates[keyword]
      ).getTime());
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
  main();
});

// Facebook initializer.
window.fbAsyncInit = () => {
  FB.init({
    appId: "1629026357232795",
    version: "v3.2"
  });
  FB.AppEvents.logPageView();
};

// Check for authentication. Calls load() if successful.
function main() {
  FB.getLoginStatus(response => {
    if (response.status == "connected") {
      console.log("Acquired token: " + response.authResponse.accessToken)
      id("login_msg").classList.add("hide");
      load();
    }
    else {
      posts = [];
      id("login_msg").classList.remove("hide");
    }
  });
}

// Load and preprocess posts from group. Calls display() if successful.
function load() {
  id("loading_msg").classList.remove("hide");
  FB.api(`/${id("group").value}/feed?limit=100`, response => {
    if (response && !response.error) {
      console.log(`Loaded ${response.data.length} posts`);
      posts = response.data.filter(
        post => post.updated_time && post.message && post.id);
      for (let post of posts) {
        post.includes = kw =>
          post.message.toLowerCase().includes(kw.toLowerCase());
        post.open = _ => {
          let id = post.id.split("_");
          window.open(`https://www.facebook.com/${id[0]}/posts/${id[1]}`);
        };
        post.rideDates = rideDates(post);
      }
      id("loading_msg").classList.add("hide");
      display();
    }
    else {
      posts = [];
      id("loading_msg").classList.add("hide");
    }
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
    let parts = id("date").value.split("-");
    --parts[1];  // zero-base the month
    ddate = new Date(...parts);
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
