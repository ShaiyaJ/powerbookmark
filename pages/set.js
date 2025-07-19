window.onload = () => {
    const SEARCH_BUTTON = document.getElementById("search");
    const URL_INPUT     = document.getElementById("url-input");
    const NAME_INPUT    = document.getElementById("name-input");
    const TAGS_INPUT    = document.getElementById("tags-input");
    const SUBMIT_BUTTON = document.getElementById("submit-url");

    // Updating active state - then setting up the bindings ensures that access to the most
    // recent version of the app is avaliable.
    PBMState.update().then(_ => {
        // If URL_INPUT is changed, query the DB for it and replace NAME and TAGS _INPUT with the correct info
        URL_INPUT.oninput = (e) => {
            const newValue = e.target.value;
            
            if (PBMState.collectionHas(newValue)) {
                const query = PBMState.getUrl(newValue);
                let tagString = "";
                
                query.tags.forEach(tag => {     // Stringify tags
                    tagString += tag + ", ";
                });
                
                NAME_INPUT.value = query.name;
                TAGS_INPUT.value = tagString;
            } else {
                NAME_INPUT.value = "";
                TAGS_INPUT.value = "";
            }
        }


        // Changing the value stored at URL_INPUT.value if it is a valid URL
        SUBMIT_BUTTON.onclick = () => {
            try {                               // Try catches invalid urls
                _ = new URL(URL_INPUT.value);
                
                // Processing TAG_INPUT to create an array of strings
                tags = TAGS_INPUT.value.split(",")  // Tags are separated by ","
                    .map(tag => tag.trim())         // then trimmed to allow for either "," or ", " when separating tags
                    .filter(tag => tag !== "");     // then compared to disallow "" to count as a separate tag
                
                // Updating PBMState and commiting changes to storage
                PBMState.setUrl(URL_INPUT.value, NAME_INPUT.value, tags);
                PBMState.save();
            } catch (_) {
                // TODO: error message
                console.error("Failed to add bookmark due to an invalid URL");
            }
        }
        
        
        // Opening the search window when the search button is clicked
        SEARCH_BUTTON.onclick = () => {
            browser.tabs.create({
                url: "/pages/search.html"
            });
        }
        
        
        // Setting URL_INPUT to the current URL
        browser.tabs.query({ currentWindow: true, active: true }).then(query => {
            const currentUrl = query[0].url;
            const searchQuery = currentUrl;
            
            URL_INPUT.value = searchQuery;
            
            URL_INPUT.dispatchEvent(new Event("input"));    // Manually triggering oninput
        });
    });
}
