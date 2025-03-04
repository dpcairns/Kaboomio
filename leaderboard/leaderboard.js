import { logout, client, getMyProfile, getUser } from '../fetch-utils.js';
import { renderLeaderboardHeader } from '../render-utils.js';

const body = document.querySelector('body');
const scoreContainerEl = document.querySelector('.score-container');
const sortParameter = document.getElementById('sort-param');
const ascdescSelect = document.getElementById('sort-asc-desc');
const loadingScreen = document.querySelector('.loading-screen');

// EVENT LISTENERS
window.addEventListener('load', async () => {
    await fetchAndDisplayLeaderboard();
    if (await getUser()) {
        await fetchAndDisplayHeader();
    }
    loadingScreen.classList.add('invisible');
});

document.addEventListener('click', (e) => {
    // LOGOUT BUTTON FUNCTIONALITY
    // curious why you couldn't just add the event listener to element itself? 
    // If I were maintaining this codebase, I'd want an explanation in comments here, since there is some brittleness here
    if (e.path[0].id === 'logout' || e.path[0].id === 'logout-icon') {
        logout();
    }
});

scoreContainerEl.addEventListener('scroll', () => {
    // again, very cool and ambitious :)
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (clientHeight + scrollTop >= scrollHeight){
        console.log(clientHeight);
    }
});

sortParameter.addEventListener('change', fetchAndDisplayLeaderboard);

ascdescSelect.addEventListener('change', fetchAndDisplayLeaderboard);

// FUNCTIONS
async function getLeaderboard(type, trueFalse){
    const response = await client
        .from('scores')
        .select('*')
        .order(type, { ascending: trueFalse })
        .range(0, 10);

    return response.body;
}

async function fetchAndDisplayLeaderboard() {
    scoreContainerEl.textContent = '';

    const ascending = ascdescSelect.value === 'asc' ? true : false;
    const scores = await getLeaderboard(sortParameter.value, ascending);

    for (let score of scores) {
        const scoreEl = document.createElement('div');
        const scoreInitials = document.createElement('h3');
        const scoreScores = document.createElement('h3');
        const scoreTime = document.createElement('p');
        scoreEl.classList.add('score');

        scoreInitials.textContent = `${score.initials}...........`;
        scoreScores.textContent = `${score.score}............`;
        scoreTime.textContent = `${score.time}`;

        scoreEl.append(scoreInitials, scoreScores, scoreTime);

        scoreEl.addEventListener('click', () => {
            window.location.replace(`../profile-page/?id=${score.profile_id}`);
        });
        
        scoreContainerEl.append(scoreEl);
    }
}

async function fetchAndDisplayHeader() {
    const profile = await getMyProfile();
    const hardHeader = document.querySelector('header');
    body.removeChild(hardHeader);
    const header = renderLeaderboardHeader(profile);
    body.prepend(header);
}