// ================= FIREBASE =================

import {
    getFirebasePrompts,
    db
} from "./firebase.js";

import {
    doc,
    updateDoc,
    increment
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

let prompts = [];


// ================= MENU =================

function toggleMenu() {

    const navMenu =
        document.getElementById("navMenu");

    if (navMenu) {
        navMenu.classList.toggle("show");
    }
}


// ================= FAVORITES =================

function getFavorites() {

    return JSON.parse(
        localStorage.getItem("aiTrendingFavorites") || "[]"
    );
}


function isFavorite(id) {

    return getFavorites().includes(String(id));
}


function toggleFavorite(id) {

    id = String(id);

    let favorites = getFavorites();

    if (favorites.includes(id)) {

        favorites =
            favorites.filter(item => item !== id);

        showToast("Removed from favorites");

    } else {

        favorites.push(id);

        showToast("Added to favorites ❤️");
    }

    localStorage.setItem(
        "aiTrendingFavorites",
        JSON.stringify(favorites)
    );

    renderPrompts(currentList);
    renderTrending();
}


// ================= LIKES =================

function getLikedPrompts() {

    return JSON.parse(
        localStorage.getItem("aiTrendingLikes") || "[]"
    );
}


function hasLiked(id) {

    return getLikedPrompts()
        .includes(String(id));
}


async function likePrompt(id) {

    id = String(id);

    if (hasLiked(id)) {

        showToast("You already liked this ❤️");

        return;
    }


    try {

        const promptRef =
            doc(db, "prompts", id);

        await updateDoc(
            promptRef,
            {
                likes: increment(1)
            }
        );


        let liked =
            getLikedPrompts();

        liked.push(id);

        localStorage.setItem(
            "aiTrendingLikes",
            JSON.stringify(liked)
        );


        const item =
            prompts.find(
                prompt =>
                    String(prompt.id) === id
            );

        if (item) {

            item.likes =
                (Number(item.likes) || 0) + 1;
        }


        showToast("Liked ❤️");

        renderPrompts(currentList);
        renderTrending();

    } catch (error) {

        console.error(
            "Like error:",
            error
        );

        showToast(
            "Like failed ❌"
        );
    }
}


// ================= VIEWS =================

async function addView(id) {

    id = String(id);

    try {

        const promptRef =
            doc(db, "prompts", id);

        await updateDoc(
            promptRef,
            {
                views: increment(1)
            }
        );


        const item =
            prompts.find(
                prompt =>
                    String(prompt.id) === id
            );

        if (item) {

            item.views =
                (Number(item.views) || 0) + 1;
        }

    } catch (error) {

        console.error(
            "View error:",
            error
        );
    }
}


// ================= OPEN PROMPT =================

function openPrompt(id) {

    window.location.href =
        "prompt.html?id=" + id;
}


// ================= SHARE =================

function sharePrompt(id) {

    const item =
        prompts.find(
            prompt =>
                String(prompt.id) === String(id)
        );

    if (!item) return;


    const url =
        window.location.href
            .split("?")[0]
            .replace("index.html", "") +
        "prompt.html?id=" + item.id;


    const shareData = {

        title: item.title,

        text:
            "Check this AI photo prompt on AI Trending Pic!",

        url: url
    };


    if (navigator.share) {

        navigator.share(shareData)
            .catch(error => {

                if (error.name !== "AbortError") {

                    copyShareLink(url);
                }

            });

    } else {

        copyShareLink(url);
    }
}


function copyShareLink(url) {

    if (navigator.clipboard) {

        navigator.clipboard.writeText(url)
            .then(() => {

                showToast("Link copied! 🔗");

            })
            .catch(() => {

                fallbackCopy(url);

            });

    } else {

        fallbackCopy(url);
    }
}


// ================= CURRENT LIST =================

let currentList = [];


// ================= CARD =================

function createPromptCard(
    prompt,
    forceTrending = false
) {

    const favorite =
        isFavorite(prompt.id);

    const liked =
        hasLiked(prompt.id);


    const card =
        document.createElement("article");

    card.className =
        "prompt-card";


    card.innerHTML = `

        <div class="image-wrapper">

            <img
                class="prompt-image"
                src="${prompt.image || ""}"
                alt="${prompt.title || "AI Photo"}"
                loading="lazy"
            >

            ${
                forceTrending ||
                prompt.trending === true
                ? `
                    <div class="trending-badge">
                        🔥 TRENDING
                    </div>
                  `
                : ""
            }

        </div>


        <div class="card-content">

            <div class="card-category">
                ${prompt.category || ""}
            </div>


            <h3>
                ${prompt.title || ""}
            </h3>


            <p class="card-description">
                ${prompt.description || ""}
            </p>


            <div class="card-stats">

                ❤️ ${Number(prompt.likes) || 0}

                &nbsp;&nbsp;

                👁️ ${Number(prompt.views) || 0}

            </div>


            <div class="card-buttons">

                <button
                    class="copy-btn"
                    onclick="copyPrompt('${prompt.id}')"
                >
                    📋 Copy
                </button>


                <a
                    href="javascript:void(0)"
                    onclick="openPrompt('${prompt.id}')"
                >
                    View
                </a>

            </div>


            <div class="card-extra-buttons">

                <button
                    onclick="likePrompt('${prompt.id}')"
                    class="like-btn ${
                        liked ? "active" : ""
                    }"
                >
                    ${liked ? "❤️ Liked" : "🤍 Like"}
                </button>


                <button
                    onclick="toggleFavorite('${prompt.id}')"
                    class="favorite-btn ${
                        favorite ? "active" : ""
                    }"
                >
                    ${favorite ? "❤️" : "♡"} Favorite
                </button>


                <button
                    onclick="sharePrompt('${prompt.id}')"
                    class="share-btn"
                >
                    🔗 Share
                </button>

            </div>

        </div>
    `;


    return card;
}


// ================= TRENDING AUTO SLIDER =================

let trendingTimer = null;
let trendingIndex = 0;


function renderTrending() {

    const grid =
        document.getElementById("trendingGrid");

    const dots =
        document.getElementById("trendingDots");

    if (!grid) return;


    if (trendingTimer) {

        clearInterval(trendingTimer);

        trendingTimer = null;
    }


    grid.innerHTML = "";


    if (dots) {

        dots.innerHTML = "";
    }


    const trendingPrompts =
        [...prompts]
            .sort((a, b) => {

                const scoreA =
                    ((Number(a.likes) || 0) * 2) +
                    (Number(a.views) || 0);

                const scoreB =
                    ((Number(b.likes) || 0) * 2) +
                    (Number(b.views) || 0);

                return scoreB - scoreA;

            })
            .slice(0, 5);


    if (trendingPrompts.length === 0) {

        return;
    }


    trendingIndex = 0;


    // ================= CREATE CARDS =================

    trendingPrompts.forEach(
        (prompt, index) => {

            const card =
                createPromptCard(
                    prompt,
                    true
                );


            if (index === 0) {

                card.classList.add(
                    "trending-active"
                );
            }


            grid.appendChild(card);


            // ================= DOT =================

            if (dots) {

                const dot =
                    document.createElement("span");

                dot.className =
                    "trending-dot";


                if (index === 0) {

                    dot.classList.add(
                        "active"
                    );
                }


                dot.onclick = function () {

                    showTrendingSlide(index);

                };


                dots.appendChild(dot);
            }

        }
    );


    // ==================================================
    // ================= SWIPE / DRAG ==================
    // ==================================================

    grid.style.touchAction = "pan-y";

    if (!grid.dataset.swipeReady) {

        grid.dataset.swipeReady = "true";

        let startX = 0;
        let startY = 0;
        let isDragging = false;


        // ================= TOUCH START =================

        grid.addEventListener(
            "touchstart",
            function (event) {

                if (
                    event.touches &&
                    event.touches.length > 0
                ) {

                    startX =
                        event.touches[0].clientX;

                    startY =
                        event.touches[0].clientY;

                    isDragging = true;
                }

            },
            {
                passive: true
            }
        );


        // ================= TOUCH END =================

        grid.addEventListener(
            "touchend",
            function (event) {

                if (!isDragging) return;

                isDragging = false;


                if (
                    !event.changedTouches ||
                    event.changedTouches.length === 0
                ) {

                    return;
                }


                const endX =
                    event.changedTouches[0].clientX;

                const endY =
                    event.changedTouches[0].clientY;


                const differenceX =
                    startX - endX;

                const differenceY =
                    startY - endY;


                // सिर्फ horizontal swipe
                if (
                    Math.abs(differenceX) <
                    Math.abs(differenceY)
                ) {

                    return;
                }


                // minimum swipe distance
                if (
                    Math.abs(differenceX) <
                    50
                ) {

                    return;
                }


                const cards =
                    grid.querySelectorAll(
                        ".prompt-card"
                    );


                if (cards.length === 0) {
                    return;
                }


                // LEFT SWIPE
                if (differenceX > 0) {

                    trendingIndex++;

                    if (
                        trendingIndex >=
                        cards.length
                    ) {

                        trendingIndex = 0;
                    }

                }


                // RIGHT SWIPE
                else {

                    trendingIndex--;

                    if (
                        trendingIndex < 0
                    ) {

                        trendingIndex =
                            cards.length - 1;
                    }
                }


                showTrendingSlide(
                    trendingIndex
                );

            },
            {
                passive: true
            }
        );


        // ================= MOUSE DRAG =================

        grid.addEventListener(
            "mousedown",
            function (event) {

                startX =
                    event.clientX;

                startY =
                    event.clientY;

                isDragging = true;

            }
        );


        grid.addEventListener(
            "mouseup",
            function (event) {

                if (!isDragging) return;

                isDragging = false;


                const endX =
                    event.clientX;

                const endY =
                    event.clientY;


                const differenceX =
                    startX - endX;

                const differenceY =
                    startY - endY;


                if (
                    Math.abs(differenceX) <
                    Math.abs(differenceY)
                ) {

                    return;
                }


                if (
                    Math.abs(differenceX) <
                    50
                ) {

                    return;
                }


                const cards =
                    grid.querySelectorAll(
                        ".prompt-card"
                    );


                if (cards.length === 0) {
                    return;
                }


                if (differenceX > 0) {

                    trendingIndex++;

                    if (
                        trendingIndex >=
                        cards.length
                    ) {

                        trendingIndex = 0;
                    }

                } else {

                    trendingIndex--;

                    if (
                        trendingIndex < 0
                    ) {

                        trendingIndex =
                            cards.length - 1;
                    }
                }


                showTrendingSlide(
                    trendingIndex
                );

            }
        );


        grid.addEventListener(
            "mouseleave",
            function () {

                isDragging = false;

            }
        );

    }


    // ================= AUTO SLIDE =================

    if (trendingPrompts.length > 1) {

        trendingTimer =
            setInterval(() => {

                trendingIndex++;

                if (
                    trendingIndex >=
                    trendingPrompts.length
                ) {

                    trendingIndex = 0;
                }


                showTrendingSlide(
                    trendingIndex
                );

            }, 4000);

    }


    // ================= SHOW SLIDE =================

    function showTrendingSlide(index) {

        const cards =
            grid.querySelectorAll(
                ".prompt-card"
            );


        const allDots =
            dots
                ? dots.querySelectorAll(
                    ".trending-dot"
                )
                : [];


        cards.forEach(card => {

            card.classList.remove(
                "trending-active"
            );

        });


        if (cards[index]) {

            cards[index].classList.add(
                "trending-active"
            );
        }


        allDots.forEach(dot => {

            dot.classList.remove(
                "active"
            );

        });


        if (allDots[index]) {

            allDots[index].classList.add(
                "active"
            );
        }


        trendingIndex = index;

    }

}


// ================= RENDER ALL =================

function renderPrompts(list) {

    const grid =
        document.getElementById("promptGrid");


    const noResults =
        document.getElementById("noResults");


    if (!grid) return;


    currentList = list;


    const sortedList =
        [...list].sort((a, b) => {

            const scoreA =
                ((Number(a.likes) || 0) * 2) +
                (Number(a.views) || 0);


            const scoreB =
                ((Number(b.likes) || 0) * 2) +
                (Number(b.views) || 0);


            return scoreB - scoreA;

        });


    grid.innerHTML = "";


    if (sortedList.length === 0) {

        if (noResults) {

            noResults.style.display =
                "block";
        }

        return;
    }


    if (noResults) {

        noResults.style.display =
            "none";
    }


    sortedList.forEach(prompt => {

        grid.appendChild(
            createPromptCard(prompt)
        );

    });
}


// ================= COPY =================

function copyPrompt(id) {

    const item =
        prompts.find(
            prompt =>
                String(prompt.id) === String(id)
        );


    if (!item) return;


    if (navigator.clipboard) {

        navigator.clipboard
            .writeText(item.prompt || "")
            .then(() => {

                showToast(
                    "Prompt copied! ✅"
                );

            })
            .catch(() => {

                fallbackCopy(
                    item.prompt || ""
                );

            });

    } else {

        fallbackCopy(
            item.prompt || ""
        );
    }
}


function fallbackCopy(text) {

    const textarea =
        document.createElement("textarea");


    textarea.value = text;


    textarea.style.position =
        "fixed";

    textarea.style.left =
        "-9999px";


    document.body.appendChild(
        textarea
    );


    textarea.select();


    try {

        document.execCommand(
            "copy"
        );

        showToast(
            "Copied! ✅"
        );

    } catch {

        showToast(
            "Copy failed ❌"
        );
    }


    document.body.removeChild(
        textarea
    );
}


// ================= TOAST =================

function showToast(message) {

    let toast =
        document.getElementById("toast");


    if (!toast) {

        toast =
            document.createElement(
                "div"
            );


        toast.id =
            "toast";


        toast.style.position =
            "fixed";

        toast.style.bottom =
            "25px";

        toast.style.left =
            "50%";


        toast.style.transform =
            "translateX(-50%)";


        toast.style.background =
            "#22222a";


        toast.style.color =
            "#ffffff";


        toast.style.padding =
            "12px 20px";


        toast.style.borderRadius =
            "10px";


        toast.style.zIndex =
            "9999";


        toast.style.border =
            "1px solid #444450";


        toast.style.fontSize =
            "14px";


        document.body.appendChild(
            toast
        );
    }


    toast.textContent =
        message;


    toast.style.display =
        "block";


    setTimeout(() => {

        toast.style.display =
            "none";

    }, 2000);
}


// ================= SMART SEARCH =================

function performSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) return;


    const query =
        input.value
            .toLowerCase()
            .trim();


    if (query === "") {

        renderPrompts(prompts);

        renderTrending();

        return;
    }


    const results =
        prompts.filter(prompt => {

            const searchableText = [

                prompt.title,

                prompt.category,

                prompt.description,

                prompt.prompt,

                ...(prompt.tags || [])

            ]
                .join(" ")
                .toLowerCase();


            return searchableText
                .includes(query);

        });


    renderPrompts(results);
}


// ================= SEARCH BUTTON =================

function searchPrompts() {

    performSearch();


    document.getElementById(
        "trending"
    )?.scrollIntoView({

        behavior: "smooth"

    });
}


// ================= LIVE SEARCH =================

function setupSearch() {

    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) return;


    input.addEventListener(
        "input",
        () => {

            performSearch();

        }
    );


    input.addEventListener(
        "keydown",
        event => {

            if (event.key === "Enter") {

                searchPrompts();

            }

        }
    );
}


// ================= CATEGORY FILTER =================

function filterCategory(category) {

    if (category === "All") {

        renderPrompts(prompts);

        renderTrending();

        return;
    }


    const filtered =
        prompts.filter(
            prompt =>
                prompt.category === category
        );


    renderPrompts(filtered);


    document.getElementById(
        "latest"
    )?.scrollIntoView({

        behavior: "smooth"

    });
}


// ================= LOAD FIREBASE DATA =================

async function loadFirebaseData() {

    try {

        showToast(
            "Loading prompts..."
        );


        const data =
            await getFirebasePrompts();


        prompts = data;


        renderTrending();

        renderPrompts(prompts);


        showToast(
            "Prompts loaded! ✅"
        );

    } catch (error) {

        console.error(
            "Firebase error:",
            error
        );


        showToast(
            "Firebase data load failed ❌"
        );

    }
}


// ================= START WEBSITE =================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        setupSearch();

        loadFirebaseData();

    }
);


// ================= HTML BUTTON ACCESS =================

window.toggleMenu =
    toggleMenu;

window.toggleFavorite =
    toggleFavorite;

window.likePrompt =
    likePrompt;

window.openPrompt =
    openPrompt;

window.sharePrompt =
    sharePrompt;

window.copyPrompt =
    copyPrompt;

window.searchPrompts =
    searchPrompts;

window.filterCategory =
    filterCategory;