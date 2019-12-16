var geoLat;
var geoLon;

var api_key = "eff4f0ea6823536150758ef050977494";
var api_queryWeather;
var api_queryForecast;

var weatherObj = {
    today: { name: null, date: null, icon: null, temp: null, humidity: null, windSpeed: null, uvIndex: null, cityId: null },
    forecast: []
};

var uvIndex;

setLayouts();
getLocation();
displayWeather();

// Find geolocation of user if possible
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition);
    } else {
        return;
    }
}

function showPosition(position) {
    geoLat = position.coords.latitude;
    geoLon = position.coords.longitude;

    // If geolocation data is available, call ajax using that information in query
    api_queryWeather = "http://api.openweathermap.org/data/2.5/weather?lat=" + geoLat + "&lon=" + geoLon + "&APPID=" + api_key;
    callingAjax();

    console.log("Latitude: " + geoLat + " Longitude: " + geoLon);
}

// Display initial layouts
function setLayouts() {
    let divLeft = $(".divLeft");
    let divRight = $(".divRight");

    divLeft.html(/*html*/`
        <div class="form-group search">
            <label for="inputSearch"><h6>Search for a City (by name or US zip code):</h6></label>
            <div class="input-group">
                <input type="text" class="form-control" id="inputSearch">
                <span class="input-group-btn">
                    <button type="submit" class="btn btn-primary" id="searchBtn"><i class="fas fa-search"></i></button>
                </span>
            </div>
            <div class="message"></div>
        </div>
        <div class="recentSearches"></div>
        `)

    divRight.html(/*html*/`
        <div class="card weatherToday my-4"></div>
        <div class="forecastHead"><h4>5-Day Forecast: </h4></div>
        <div class="forecast"></div>
        `)
}

// If a user presses enter or click button, call ajax
$("#inputSearch").keypress(function (e) {
    var key = e.which;
    if (key == 13) {
        $("#searchBtn").click();
        return false;
    }
});

$("#searchBtn").on("click", function () {
    $(".message").text("");
    event.preventDefault();
    let inputVal = $("#inputSearch").val().trim();
    if (isNaN(inputVal)) {
        inputVal = inputVal.charAt(0).toUpperCase() + inputVal.substring(1).toLowerCase();
        api_queryWeather = "http://api.openweathermap.org/data/2.5/weather?q=" + inputVal + "&APPID=" + api_key;
    }
    else {
        api_queryWeather = "http://api.openweathermap.org/data/2.5/weather?zip=" + inputVal + ",us" + "&APPID=" + api_key;
    }
    console.log(inputVal)

    callingAjax();
})

// This function initiates the first ajax call
// If the user input is valid, call success_function1 otherwise call error_function
function callingAjax() {
    $.ajax({ url: api_queryWeather, success: success_function1, error: error_function });
}

// Get current weather information from the call and store data in variables and objects for the future use
function success_function1(response) {
    console.log(response);

    let lat = response.coord.lat;
    let lon = response.coord.lon;

    weatherObj.today.name = response.name;
    weatherObj.today.date = moment(response.dt * 1000).format("MM/DD/YYYY");
    console.log(response.dt)
    weatherObj.today.icon = response.weather[0].icon;
    // F = (K - 273.15) * 1.80 + 32
    weatherObj.today.temp = ((response.main.temp - 273.15) * 1.80 + 32).toFixed(1);
    weatherObj.today.humidity = response.main.humidity;
    weatherObj.today.windSpeed = response.wind.speed;
    weatherObj.today.cityId = response.id;

    api_queryForecast = "http://api.openweathermap.org/data/2.5/forecast?lat=" + lat + "&lon=" + lon + "&APPID=" + api_key;
    let api_queryUvIndex = "http://api.openweathermap.org/data/2.5/uvi?appid=" + api_key + "&lat=" + lat + "&lon=" + lon;

    // Call the next ajax function using data from the first call
    $.ajax({ url: api_queryUvIndex, success: success_function2 });
}

// Collect uvindex data and call the next function
function success_function2(response) {
    console.log(response);
    uvIndex = response.value;
    console.log("uvindex " + uvIndex);
    weatherObj.today.uvIndex = uvIndex;

    console.log(weatherObj);

    $.ajax({ url: api_queryForecast, success: success_function3 });
}

// Collect 5-day forecast data and go to the next function
function success_function3(response) {
    console.log(response);

    weatherObj.forecast = [];

    for (var i = 4; i < response.list.length; i += 8) {
        let date = moment(response.list[i].dt * 1000).format("MM/DD/YYYY");
        console.log("dt: " + response.list[i].dt)
        let icon = response.list[i].weather[0].icon;
        let temp = ((response.list[i].main.temp - 273.15) * 1.80 + 32).toFixed(1);
        let humidity = response.list[i].main.humidity;
        weatherObj.forecast.push({ "date": date, "icon": icon, "temp": temp, "humidity": humidity });
    }
    console.log(weatherObj)

    saveToLocalStorage();
}

// Retrieve data from local storage if any, add new data and store in local storage and run the next function
function saveToLocalStorage() {

    // Insert the retrieved local storage data to new array
    let arrToBeSaved = [];
    let storedValues = JSON.parse(localStorage.getItem("data"));
    if (storedValues !== null) arrToBeSaved = storedValues;

    // Check if there is existing data with the same city name and city id
    // If so, remove it
    for (var i = 0; i < arrToBeSaved.length; i++) {
        if (arrToBeSaved[i].today.cityId == weatherObj.today.cityId &&
            arrToBeSaved[i].today.name == weatherObj.today.name) arrToBeSaved.splice(i, 1);
    }

    // Insert new data in the beginning of the array and store this array to local storage
    arrToBeSaved.unshift(weatherObj);
    localStorage.setItem("data", JSON.stringify(arrToBeSaved));
    displayWeather();
}

// Display weather infomation and search history if there are data in local storage or geolocation is available
function displayWeather() {
    let storedValues = JSON.parse(localStorage.getItem("data"));
    if (storedValues == null) {
        getLocation();
        return;
    }
    let todayValues = storedValues[0].today;
    let forecastedValues = storedValues[0].forecast;
    let divRecent = $(".recentSearches");
    let divToday = $(".weatherToday");
    let divForecast = $(".forecast");

    $("#inputSearch").val("");
    divRecent.text("");

    for (var i = 0; i < storedValues.length; i++) {
        divRecent.append($("<div>").addClass("card").text(storedValues[i].today.name));
    }

    divToday.html(/*html*/`
        <div class="city"></div>
        <div class="temp"></div>
        <div class="humidity"></div>
        <div class="wind"></div>
        <div class="uvIndex"></div>
        `)

    $(".city").append(todayValues.name + " (" + todayValues.date + ") " + "<img src =http://openweathermap.org/img/wn/" +
        todayValues.icon + "@2x.png>");
    $(".temp").append("Temperature: " + todayValues.temp + " °F");
    $(".humidity").append("Humidity: " + todayValues.humidity + " %");
    $(".wind").append("Wind Speed: " + todayValues.windSpeed + " MPH");
    $(".uvIndex").append("UV Undex: " + todayValues.uvIndex);

    divForecast.html("");

    let forecastArr = [{ day: $("<div>").addClass("day day1") }, { day: $("<div>").addClass("day day2") },
    { day: $("<div>").addClass("day day3") }, { day: $("<div>").addClass("day day4") }, { day: $("<div>").addClass("day day5") }];
    let index = 0;

    forecastArr.forEach(function (element) {
        element.day.append($("<div>").addClass("date").append(forecastedValues[index].date));
        element.day.append($("<div>").addClass("icon").append("<img src =http://openweathermap.org/img/wn/" +
            forecastedValues[index].icon + "@2x.png>"));
        element.day.append($("<div>").addClass("temp").append("Temp: " + forecastedValues[index].temp + " °F"));
        element.day.append($("<div>").addClass("humidity").append("Humidity: " + forecastedValues[index].humidity + " %"));
        divForecast.append(element.day);
        index++;
    })
}

// Display a message if user input is invalid to get through the first ajax call
function error_function() {
    $(".message").text("Type a valid city name");
}

