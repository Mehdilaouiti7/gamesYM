window.GYMGameLink = {
  build: function(code){
    return location.origin + location.pathname + '?code=' + encodeURIComponent(code);
  }
};
