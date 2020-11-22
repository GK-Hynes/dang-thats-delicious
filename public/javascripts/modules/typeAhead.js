import axios from "axios";
import dompurify from "dompurify";

function searchResultsHTML(stores) {
  return stores
    .map((store) => {
      return `
      <a href="/store/${store.slug}" className="search__result"><strong>${store.name}</strong></a>
      `;
    })
    .join("");
}

function typeAhead(search) {
  if (!search) return;

  const searchInput = search.querySelector("input[name='search']");
  const searchResults = search.querySelector(".search__results");

  searchInput.on("input", function () {
    // If there is no value, quit it
    if (!this.value) {
      searchResults.style.display = "none";
      return;
    }
    // Show the search results
    searchResults.style.display = "block";

    axios
      .get(`/api/search?q=${this.value}`)
      .then((res) => {
        if (res.data.length) {
          searchResults.innerHTML = dompurify.sanitize(
            searchResultsHTML(res.data)
          );
          return;
        }
        // tell them nothing came back
        searchResults.innerHTML = dompurify.sanitize(
          `<div className="search__result">No results for ${this.value} found!</div>`
        );
      })
      .catch((err) => {
        console.error(err);
      });
  });

  // Handle keyboard inputs
  searchInput.on("keyup", (e) => {
    // If they're not pressing up, down or enter, ignore
    if (![38, 40, 13].includes(e.keycode)) {
      return; // nah
    }
    const activeClass = "search__result--active";
    const current = search.querySelector(`.${activeClass}`);
    const items = search.querySelectorAll(".search__result");
    let next;
    if (e.keycode === 40 && current) {
      next = current.nextElementSibling || items[0];
    } else if (e.keycode === 40) {
      next = items[0];
    } else if (e.keycode === 38 && current) {
      next = current.previousElementSibling || items[items.length - 1];
    } else if (e.keycode === 38) {
      next = items[items.length - 1];
    } else if (e.keycode === 13 && current.href) {
      window.location = current.href;
      return;
    }
    if (current) {
      current.classList.remove(activeClass);
    }
    next.classList.add(activeClass);
  });
}

export default typeAhead;
