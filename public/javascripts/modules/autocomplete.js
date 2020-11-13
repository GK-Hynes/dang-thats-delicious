function autocomplete(input, latInput, lngInput) {
  if (!input) return; // skip function if no input

  const dropdown = new google.maps.places.Autocomplete(input);

  dropdown.addListener("place_changed", () => {
    const place = dropdown.getPlace();
    latInput.value = place.geometry.location.lat;
    lngInput.value = place.geometry.location.lng;
  });

  // don't submit if someone hits enter on address field
  input.on("keydown", (e) => {
    if (e.keycode === 13) {
      e.preventDefault();
    }
  });
}

export default autocomplete;
