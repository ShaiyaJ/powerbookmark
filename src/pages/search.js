window.onload = () => {
    const URL_INPUT     = document.getElementById("url-input");
    const NAME_INPUT    = document.getElementById("name-input");
    const TAGS_INPUT    = document.getElementById("tags-input");
    const SUBMIT_BUTTON = document.getElementById("submit-search");
    const RESULTS_AREA  = document.getElementById("results");

    TAGS_INPUT.oninput = () => {
        TAGS_INPUT.classList.remove("error");    // Removing error style if it exists
    }

    SUBMIT_BUTTON.onclick = () => {                // TODO: split into seprate functions even if they aren't going to be reused
        // Updating active state - ensures that access to the most recent version of the app state is avaliable.
        PBMState.update().then(_ => {

            // Process TAG_INPUT into tokens
            const tagTokens = TAGS_INPUT.value.split(" ")
                .map(tag => tag.trim())
                .filter(tag => tag !== "")
                .map(tag => {               // Creating separate tokens for "(" and ")"
                    let ret = [];
                    
                    if (tag.startsWith("(")) {
                        ret.push("(");
                    }
                    
                    ret.push(tag.replaceAll("(", "").replaceAll(")", ""));
                    
                    if (tag.endsWith(")")) {
                        ret.push(")");
                    }
                    
                    return ret;
                })
                .flat();                    // Flattening [["(", tag, ..., ")"], ...] to a single dimension array

            // Filter out tags based on given tokens
            let filtered;
            
            if (tagTokens.length > 0) {
                // Process tokens into reverse polish notation
                let rpnOperations = infixToPostfix(tagTokens).reverse();
                
                // Evaluate reverse polish notation
                let stack = [];
                
                while (rpnOperations.length != 0) {
                    try {
                        const op = rpnOperations.pop()

                        switch (op) {
                            case "&":
                                stack.push( PBMState.and(stack.pop(), stack.pop()) );
                                break;
                            case "|":
                                stack.push( PBMState.or(stack.pop(), stack.pop()) );
                                break;
                            default:
                                stack.push(     // Evaluating !tag and tag separately
                                    op.startsWith("!") ? PBMState.withoutTag(op.substring(1)) : PBMState.withTag(op)
                                );
                                break;
                        }
                    } catch (e) {               // If an error happens during evaluation, communicate this with the user and end execution early
                        TAGS_INPUT.classList.add("error");
                        return;
                    }
                }
                
                filtered = [...stack[0]];
            } else {            // If there are no tokens, include everything
                filtered = PBMState.getAllUrls();
            }
            
            // Fuzzy search by name and url
            filtered.sort((a, b) => {
                const lowerA = a.toLowerCase();
                const lowerB = b.toLowerCase();
                
                // Comparing URL
                const urlInput = URL_INPUT.value.toLowerCase();
                const nameInput = NAME_INPUT.value.toLowerCase();
                
                const urlBonusA = lowerA.includes(urlInput) ? -1000 : 0;
                const urlBonusB = lowerB.includes(urlInput) ? -1000 : 0;

                const urlScoreA = levenshteinCompare(urlInput, lowerA) + urlBonusA;
                const urlScoreB = levenshteinCompare(urlInput, lowerB) + urlBonusB;

                // Comparing name
                const nameA = PBMState.getUrl(a).name.toLowerCase();
                const nameB = PBMState.getUrl(b).name.toLowerCase();
                
                const nameBonusA = nameA.includes(nameInput) ? -1000 : 0;
                const nameBonusB = nameB.includes(nameInput) ? -1000 : 0;

                const nameScoreA = levenshteinCompare(nameInput, nameA) + nameBonusA;
                const nameScoreB = levenshteinCompare(nameInput, nameB) + nameBonusB;

                const totalA = urlScoreA + (nameScoreA * 3);
                const totalB = urlScoreB + (nameScoreB * 3);
                
                return totalA - totalB;
            });
            
            // Update results area with results
            RESULTS_AREA.innerHTML = "";
            
            filtered.forEach((url, i) => {
                const entry = document.createElement("div");
                entry.classList.add("entry");
                
                const removeButton = document.createElement("button");
                const nameDisplay = document.createElement("div");
                const urlDisplay = document.createElement("div");
                const tagsDisplay = document.createElement("div");
                tagsDisplay.classList.add("tags-display");
                
                removeButton.onclick = (e) => {
                    e.stopPropagation();
                    entry.remove();
                    PBMState.removeUrl(url);
                    PBMState.save();    
                }
                
                entry.onclick = () => {
                    browser.tabs.create({
                        url: url
                    });
                }
                
                const urlEntry = PBMState.getUrl(url);
                
                removeButton.innerText = "X"
                nameDisplay.innerText = urlEntry.name;
                urlDisplay.innerText = url;
                urlEntry.tags.forEach(tag => {
                    const tagDiv = document.createElement("div");
                    tagDiv.innerText = tag;
                    tagsDisplay.appendChild(tagDiv);
                });
                
                entry.appendChild(removeButton);
                entry.appendChild(nameDisplay);
                entry.appendChild(urlDisplay);
                entry.appendChild(tagsDisplay);
                RESULTS_AREA.appendChild(entry);
            });
        });
    }
}


function infixToPostfix(queryTokens) {
    const operations = {
        "&": {precedence: 2, associativity: "left"},
        "|": {precedence: 1, associativity: "left"}
    };
    
    let outputQueue = [];
    let operatorStack = [];
    
    queryTokens.forEach(token => {
        let opLen = operatorStack.length;
        
        if (Object.hasOwn(operations, token)) {
            while (opLen > 0 && operatorStack[opLen - 1] !== "(" && 
                  (operations[operatorStack[opLen - 1]].precedence > operations[token].precedence || 
                 ((operations[operatorStack[opLen - 1]].precedence === operations[token].precedence) && operations[token].associativity === "left"))) {
                 
                outputQueue.push(operatorStack.pop())
                opLen--;
            }
            
            operatorStack.push(token);
        } else if (token === "(") {
            operatorStack.push(token);
        } else if (token === ")") {
            while (operatorStack[opLen - 1] != "(" && opLen > 0) {
                const op = operatorStack.pop();
                opLen--;
                
                outputQueue.push(op);
            }
            
            if (opLen <= 0) {
                throw new Error("Mismatched parentheses");
            }
            
            operatorStack.pop();
        } else {
            outputQueue.push(token);
        }
    });
    
    operatorStack.forEach(op => outputQueue.push(op));
    
    return outputQueue;
}


function levenshteinDistance(s1, s2) {
    s1 = "." + s1;
    s2 = "." + s2;
    
    let ret = [];
    
    // Creating the levenshteinDistance matrix
    for (let s = 0; s < s1.length; s++)
        ret.push(Array(s2.length));
        
    ret[0][0] = 0;
    
    for (let i = 1; i < s1.length; i++)
        ret[i][0] = i
 
    for (let j = 1; j < s2.length; j++)
        ret[0][j] = j
        
    // Calculating array
    for (let j = 1; j < s2.length; j++) {
        for (let i = 1; i < s1.length; i++) {
            let substitutionCost = 0;
            
            if (s1[i] != s2[j]) {
                substitutionCost = 1; 
            } 
            
            ret[i][j] = Math.min(
                ret[i-1][j] + 1,
                ret[i][j-1] + 1,
                ret[i-1][j-1] + substitutionCost
            );
        }
    }
    
    return ret[s1.length-1][s2.length-1];
}


function levenshteinCompare(query, a, b) {
    const aDistance = levenshteinDistance(query, a);
    const bDistance = levenshteinDistance(query, b);
    
    return aDistance - bDistance;
}
