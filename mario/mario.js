/* Amazing work, but really tough for humans to read. 1120 lines is way too big. I imagine you would have gotten here if you had more time, but I would want to see this file split up into a few smaller files, named by category (game-scene.js, state-scene.js, lose-scene.js, levels-tata.js, etc), with even more comments to clarify the some obscure decisions (why e.path[0]? what is a glideSpeed and when does it change, etc). I would try to do it myself, but I'm afraid of breaking everything and having to pour hours into debugging and understanding your code, which speaks to the problem here. I imagine the merge conflicts were occasionally arduous.

As it is, this code is not maintainable, and would have to be superglued to the team that wrote it. As impressive as your outcomes are here, inheriting this codebase would be a real chore, and if this were in a production app, you might find yourself constantly fielding questions from other devs about the specifics of the mysterious work on this page. It's an annoying place to find yourself as a developer: you will have moved on to other interesting problems, but new devs will constantly be dragging you back to helping with this file.

Also, storing more of your numbers in constants would be important for maintainability--you do this a bit throughout, but `e.pos.y >= 273` should be `e.pos.y >= NUMBER_WITH_A_CLARIFYING_NAME`, where the variable is possibly defined in a separate constants.js file. 

*/

// i'm not going to do all of them, but strings that are reused are called 'magic strings' and should live in constants (like so) in a separate file. Otherwise, misspellings will not be caught by VSCode, and difficut-to-debug problems will emerge
const DANGEROUS = 'dangerous';

const fontObject = {
    size: 18,
    width: 320, 
    font: 'sinko', 
};

import { checkAuth, logout, getMyProfile, createScore } from '../fetch-utils.js';
import { renderMarioHeader } from '../render-utils.js';
import kaboom from '../kaboom/dist/kaboom.mjs';

const bodyDOM = document.querySelector('body');
const gameboy = document.getElementById('gameboyContainer');
const loadingScreen = document.querySelector('.loading-screen');
let canvas = null;

checkAuth();

document.addEventListener('click', async (e) => {
    // LOGOUT BUTTON FUNCTIONALITY
    if (e.path[0].id === 'logout' || e.path[0].id === 'logout-icon') {
        logout();
    }
    // FULLSCREEN BUTTON FUNCTIONALITY
    const buttonId = e.path[0].id;
    await goFullscreen(e, buttonId);
    await goGameboy(e, buttonId);
    await muteGame(e, buttonId);
    await unmuteGame(e, buttonId);
    // STAY FOCUSED TO CANVAS IF CLICKING ANYWHERE ELSE BUT BUTTONS
    window.canvas.focus();
});

//INITIALIZE KABOOM
kaboom({
    global: true,
    width: 608,
    height: 342,
    scale: 3, 
    debug: true,
    frameRate: 60,
    background: [4, 156, 216, 1],
});

//SPRITES LOAD
//mario level sprites
loadSprite('coin', '../assets/coin.png');
loadSprite('brick', '../assets/brick.png');
loadSprite('block', '../assets/box.png');
loadAseprite('mario', '../assets/all-mario.png', '../assets/mario.json');
loadSprite('mushroom', '../assets/mushroom.png');
loadAseprite('enemies', '../assets/enemies.png', '../assets/enemies.json');
loadSprite('surprise-box', '../assets/surprise-box.png');
loadSprite('bullet', '../assets/bullet.png');
loadSprite('pipe-top', '../assets/pipeTop.png');
loadSprite('castle', '../assets/castle.png');
loadSprite('fireball', '../assets/fireball.png');
loadSprite('invisible', '../assets/invisible-image.png');
loadSprite('flower', '../assets/fire_flower.gif');
loadAseprite('over-world', '../assets/over-world.png', '../assets/over-world.json');
loadSprite('cloud', '../assets/cloud.png');
loadSprite('hill', '../assets/hill.png');
loadSprite('shrub', '../assets/shrubbery.png');
loadSprite('hard-block', '../assets/hard-block.png');
loadSprite('pipe-bottom', '../assets/pipeBottom.png');
loadSprite('spiny', '../assets/spiny.gif');
loadSprite('beatle', '../assets/beatle.gif');

//start screen sprites
loadSprite('start-screen', '../assets/start-screen.png');

//sounds to play during gameplay
loadRoot('../assets/');
loadSound('jump', 'sounds/marioJump.mp3');
loadSound('theme', 'sounds/mainTheme.mp3');
loadSound('fireballSound', 'sounds/fireball.mp3');
loadSound('gameOver', 'sounds/gameOver.mp3');
loadSound('powerUp', 'sounds/powerUp.mp3');
loadSound('pipeSound', 'sounds/pipe.mp3');
loadSound('silence', 'sounds/silence.mp3');
loadSound('superstar', 'sounds/superstar.mp3');

//PLAY MARIO THEME SONG ON LOAD
let music = play('theme'); 
music.pause();
volume(1);

//START OPENING MARIO SCENE
scene('start', () => {
    music.volume(0.05);
    // Start screen labels
    add([
        sprite('start-screen'),
        origin('center'), 
        pos(center().x, center().y - 30), 
        scale(0.65),
    ]);
    add([
        text('Press Spacebar To Start'),
        origin('center'), 
        pos(center().x, center().y + 90), 
        scale(0.25)
    ]);

    // Press space to continue
    onKeyDown('space', () => {
        go('game', { score: 0, count: 0, levelNumber: 1, totalPlayTime: 0 });
    });
});

//GAME SCENE
//this area contains all info about the actual gameplay of Mario
scene('game', ({ score, count, levelNumber, totalPlayTime }) => {
    layers(['bg', 'obj', 'ui'], 'obj'); 
    music.play();
    music.volume(0.05);
    camPos(310, 160);
    
    // GAMEPLAY VARIABLES
    let marioRightSpeed = 20;
    let marioLeftSpeed = 20;
    let marioLeftGlideSpeed = 0;
    let marioRightGlideSpeed = 0;
    let marioAirGlideSpeed = 0;
    let isJumping = true; 
    let marioDirection = 'right';
    let bigMario = false;
    let fireMario = false;
    let timeLeft = 400;
    let currentLevel = Number(levelNumber);
    let lastMarioXPos = 0;
    let currMarioXPos = 0;
    let currTime = 0;
    let lastFrame = 0;
    let currFrame = 0;
    let gameLoadTime = time();
    let levelPlayTime = 0;
    const fallToDeath = 500;
    const enemyScore = 100;
    const marioJumpHeight = 510;
    const coinScore = 200;

    //GAME LEVEL CONFIG
    const mapWidth = 3000;
    
    //setting global variable for all level maps to be used in gameplay
    const Levels = [[
        '                                                                                                                                                                                         ',
        '                                                                                                    !                                                                    !               ',
        '                               !                                                                                                     !                    !                              ',
        '         !                                                     !                                                    !                                                                    ',
        '                                            !                                                              !                           !                !                          i     ',
        '                    !                                                           !                                                                                      /           i     ',
        '                %                                           =====   ===%              #          ===    =%%=                                                          //           i     ',
        '                                                                                                                                                                     ///           i     ',
        '                                                                                                                                                                    ////           i     ',
        '                                                                                                                                                                   /////           i     ',
        '          %   =&=#=                 -       -            =#=           =    ==     %  %  %    =          ==        /  /          //  /              ==%=          //////           i     ',
        '                             -      |       |                                                                     //  //        ///  //      -               -   ///////           i     ',
        '                       -     |      |       |                                                                    ///  ///      ////  ///     |               |  ////////           i     ',
        '     ) (   ^           |     |     ^|   ^   |  (           (          )          ^     )        )               ////  ////    /////  ////    |      ^   ^    | /////////           i     ',
        '====================================================  ==========   ================================================================  ====================================================',
        '====================================================  ==========   ================================================================  ====================================================',
        '====================================================  ==========   ================================================================  ====================================================',
    ], 
    [
        '                                                                                          !             %             !                 !            !                   !                ',
        '                                                                       !                                                                                                                  ',
        '          !                                                                                       !                              !      !                   !                             ',
        '                                                   !                           !                   ======   !                                                                   !         ',
        '               %%                   !                                                                                        !                 !                                          ',
        '                          !                                                         ======                                                                              /                 ',
        '   !                                                                                                                                                   !               //               ! ',
        '              ====                                                          ====                                                                                      ///                 ',
        '                     !                                                                                 =======                                                       ////                 ',
        '                                                                ==                                                    =====                                         /////                 ',
        '           =%%=  ====                                                     ======                  ======                                         -                 //////                 ',
        '                                                           -                                                                     //    -         |                ///////                 ',
        '                                                      -    |                                                                   ////    |         |               ////////                 ',
        '   (   (        )           ^         )          s    |   )|           ^  (   ^ )    ^ )    ^               )        (        /////    |  s    s |           s  /////////  )   )   i    ) ',
        '===================================================   ==========   =================================     ==========================   ====================================================',
        '===================================================   ==========   =================================     ==========================   ====================================================',
        '===================================================   ==========   =================================     ==========================   ====================================================',
    ],
    [
        '                                                         !                                 !        *****%             !                 !            !                   !               ',
        '           !                                   !                                                    ******                                                                                ',
        '                                                                                                 !  ******                            !      !                   !             %          ',
        '                            !                              !                    !                *  ======   !                                                                  !         ',
        '                                         !                                                      ==                           !                 !                                          ',
        '     !                                                                            =&=    =%=                                                                             /                ',
        '                                                                                                                                                      !                 //              ! ',
        '                                                                                     ***                                                                               ///                ',
        '         ==%==%==                                                                  ===%===                                        =====                               ////                ',
        '                                                                                                                                                                     /////                ',
        '                            *                  *            /                                                            -                                          //////                ',
        '                         *     *           *   -           //                 ======   =============               -     |                       -                 ///////                ',
        '                      *     -     *            |          ///                                                -     |     |                       |                ////////                ',
        '    (   * ) *  *  *)  *     |    )   *  *      |        //////        ^ )  ^   )  ^    ^)   ^ )  ^           |  )  |     |   ^ )          s    s |           s   /////////     )   i    ) ',
        '===================================================   ==========   =================================     ==========================   ====================================================',
        '===================================================   ==========   =================================     ==========================   ====================================================',
        '===================================================   ==========   =================================     ==========================   ====================================================',
    ]];

    //configuring the map to display
    
    const levelConfig = {
        width: 20,
        height: 20,
        'i': () => [sprite('invisible'), area(), solid(), 'invisible'],
        '=': () => [sprite('brick'), area(), solid(), 'brick'],
        '*': () => [sprite('coin'), area(), 'coin'],
        '%': () => [sprite('surprise-box'), solid(), area(), bump(), 'coin-surprise', 'brick'],
        '&': () => [sprite('surprise-box'), solid(), area(), bump(), 'fire-surprise', 'brick'],
        'f': () => [sprite('flower'), solid(), area(), 'fire', 'powerup', body()],
        '#': () => [sprite('surprise-box'), solid(), area(), bump(), 'mushroom-surprise', 'brick'],
        '^': () => [sprite('enemies', { anim: 'GoombaWalk' }), solid(), area(20, 20), 'goomba', DANGEROUS, body(), patrol(150)],
        'k': () => [sprite('enemies', { anim: 'KoopaWalk' }), solid(), area(), 'koopa', DANGEROUS, body(), patrol(150)],
        's': () => [sprite('spiny'), solid(), area(), 'bullet', DANGEROUS, body(), patrol(150)],
        'b': () => [sprite('bullet'), solid(), area(), 'bullet', DANGEROUS],
        '-': () => [sprite('pipe-top'), solid(), area(), 'pipe', pos(0, 2), scale(1.2), 'brick'],
        '+': () => [sprite('block'), solid(), area(), bump()],
        '@': () => [sprite('mushroom'), solid(), area(), 'mushroom', 'powerup', body(), patrol(150)],
        '>': () => [sprite('fireball'), solid(), area(), 'mario-fireball', body()],
        '!': () => [sprite('cloud'), pos(20, 50), layer('bg')],
        '(': () => [sprite('hill'), pos(0, -15), layer('bg')],
        ')': () => [sprite('shrub'), pos(0, 3), layer('bg')],
        '/': () => [sprite('hard-block'), solid(), area(), scale(1.2), 'brick'],
        '|': () => [sprite('pipe-bottom'), solid(), area(), scale(1.2), 'brick']
    };

    //initalize level
    const gameLevel = addLevel(Levels[currentLevel - 1], levelConfig);

    
    //MARIO & HIS MOVEMENT
    //INITIALIZING MARIO
    const mario = add([
        sprite('mario', { frame: 0, anim: 0 }), 
        solid(), 
        area({ width: 20, height: 20 }),
        pos(20, 240),        
        body(),
        origin('bot'),
        'mario'
    ]);

    // CAMERA AND MARIO MOVEMENT BASED ON 60 FPS
    mario.onUpdate(() => {
        lastFrame = currFrame;
        currFrame = checkIfNewFrame(currTime, currFrame);
        if (currFrame > lastFrame) {
            // SLOWING DOWN MARIO WHEN IDLE OR MOVING IN THE OPPOSITE DIRECTION
            currMarioXPos = mario.pos.x;
            slowMarioRightSpeed(marioRightSpeed, lastMarioXPos, currMarioXPos);
            slowMarioLeftSpeed(marioLeftSpeed, lastMarioXPos, currMarioXPos);
            lastMarioXPos = currMarioXPos;
            // LEFT GLIDE
            marioLeftGlideSpeed = marioLeftGlide(marioLeftGlideSpeed, mario);
            // RIGHT GLIDE
            marioRightGlideSpeed = marioRightGlide(marioRightGlideSpeed, mario);
            // AIR GLIDE
            if (!mario.isGrounded()) {
                mario.move(marioAirGlideSpeed, 0);
            }
        }
        //CAMERA POSITIONING
        let currCam = camPos();
        if (currCam.x < mario.pos.x) {
            camPos(mario.pos.x, currCam.y);
        }
    });

    //MARIO ACTIONS
    //mario move left using left key
    onKeyDown('left', () => {
        marioLeftGlideSpeed = 0;
        if (currFrame > lastFrame) {
            if (marioRightGlideSpeed > 0) {
                marioRightGlideSpeed = marioRightGlideSpeed - 2;
            }
            if (marioLeftSpeed < 140) {
                marioLeftSpeed = marioLeftSpeed + 2;
            }
        }
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftSpeed, 0);
            mario.flipX(true);
        }
        marioDirection = 'left';
    });

     //mario glide after releasing left key
    onKeyRelease('left', () => {
        marioRightGlideSpeed = 0;
        marioLeftGlideSpeed = marioLeftSpeed;
        marioLeftSpeed = 20;
    });
    
    //mario movement on pressing right key
    onKeyDown('right', () => {
        marioRightGlideSpeed = 0;
        if (currFrame > lastFrame) {
            if (marioLeftGlideSpeed > 10) {
                marioLeftGlideSpeed = marioLeftGlideSpeed - 2;
            }
            if (marioRightSpeed < 140) {
                marioRightSpeed = marioRightSpeed + 2;
            }
        }
        mario.move(marioRightSpeed, 0);
        mario.flipX(false);
        play('silence');
        marioDirection = 'right';
    });
    
    //mario glide after releasing right key
    onKeyRelease('right', () => {
        marioLeftGlideSpeed = 0;
        marioRightGlideSpeed = marioRightSpeed;
        marioRightSpeed = 20;
    });

    //mario jumps on pressing space key
    onKeyPress('space', () => {
        if (mario.isGrounded()) {
            mario.jump(marioJumpHeight);
            if (marioRightSpeed > marioLeftSpeed) {
                marioAirGlideSpeed = marioRightSpeed / 3;
            } else {
                marioAirGlideSpeed = -marioLeftSpeed / 3;
            }
            const jump = play('jump');
            jump.volume(0.05);
        }
    });

    //Updating Mario Frames and Animations based on user actions
    mario.onUpdate(() => {
        if (mario.isGrounded()) {
            isJumping = false;
        } else {
            isJumping = true;
        }
        if (mario.pos.y >= fallToDeath) {
            totalPlayTime = totalPlayTime + (400 - timeLeft);
            go('lose', { score: scoreLabel.value, time: totalPlayTime, level: currentLevel });
        }
        updateMarioSprite();
    });

    //function to check mario logic to get right frame and animation
    function updateMarioSprite() {
        if (isJumping) {
            mario.frame = fireMario ? 22 : bigMario ? 13 : 5;
        } else {
            if (isKeyDown('left') || isKeyDown('right')) {
                const anim = fireMario ? 'FlameRun' : bigMario ? 'RunningBig' : 'Running';
                if (mario.curAnim() !== anim) {
                    mario.play(anim);
                }
            } else {
                mario.frame = fireMario ? 17 : bigMario ? 8 : 0;
            }
        }
    }

    //MARIO ACTIONS
    //mario interactions withDANGEROUSitems on screen (i.e. Goombas and Koopas)
    mario.onCollide(DANGEROUS, (d) => {
        if (isJumping) {
            if (d.is('goomba')) {
                d.frame = 2;
                d.unuse('anim');
                d.unuse('patrol');
                d.unuse(DANGEROUS);
                d.unuse('solid');
                d.area.height = 10;
                scoreLabel.value += enemyScore;
                scoreLabel.text = scoreLabel.value;
                addScoreText(d, enemyScore);
            } 
        } else {
            if (bigMario || fireMario) {
                destroy(d);
                addCarefulText();
                mario.area.height = 20;
                mario.area.width = 20;
                wait(0.1, () => {
                    bigMario = false;
                    fireMario = false;
                }); 
            } else if (!bigMario) {
                totalPlayTime = totalPlayTime + (400 - timeLeft);
                go('lose', { score: scoreLabel.value, time: totalPlayTime, level: currentLevel });
                music.pause();
            }
        }
    });

    //mario interactions with bricks when they are headbutted
    mario.onCollide('brick', (obj) => {
        const marioPlusBlockHeight = bigMario || fireMario ? 54 : 40;
        if (mario.pos.y === obj.pos.y + marioPlusBlockHeight) {
            const mushroomSurprises = get('mushroom-surprise');
            const coinSurprises = get('coin-surprise');
            const fireSurprises = get('fire-surprise');
            for (let coinSurprise of coinSurprises) {
                const marioDistance = coinSurprise.pos.x - mario.pos.x;
                if (mario.pos.y === coinSurprise.pos.y + marioPlusBlockHeight && marioDistance > -20 && marioDistance < 0) {
                    destroy(coinSurprise);
                    gameLevel.spawn('*', coinSurprise.gridPos.sub(0, 1));
                    const box = gameLevel.spawn('+', coinSurprise.gridPos.sub(0, 0));
                    box.bump(8, 2, true, true);
                }
            }
            for (let fireSurprise of fireSurprises) {
                const marioDistance = fireSurprise.pos.x - mario.pos.x;
                if (mario.pos.y === fireSurprise.pos.y + marioPlusBlockHeight && marioDistance > -20 && marioDistance < 0) {
                    destroy(fireSurprise);
                    gameLevel.spawn('f', fireSurprise.gridPos.sub(0, 1));
                    const box = gameLevel.spawn('+', fireSurprise.gridPos.sub(0, 0));
                    box.bump(8, 2, true, true);
                }
            }
            for (let mushroomSurprise of mushroomSurprises) {
                const marioDistance = mushroomSurprise.pos.x - mario.pos.x;
                if (mario.pos.y === mushroomSurprise.pos.y + marioPlusBlockHeight && marioDistance > -20 && marioDistance < 0) {
                    destroy(mushroomSurprise);
                    gameLevel.spawn('@', mushroomSurprise.gridPos.sub(0, 1));
                    const box = gameLevel.spawn('+', mushroomSurprise.gridPos.sub(0, 0));
                    box.bump(8, 2, true, true);
                }
            }
        }
    });

    //mario interactions with coins on collision
    mario.onCollide('coin', (obj) => {
        destroy(obj);
        scoreLabel.value += coinScore;
        scoreLabel.text = scoreLabel.value;
        coinCountLabel.value += 1;
        coinCountLabel.text = 'x' + coinCountLabel.value;
        addScoreText(obj, coinScore);
    });

    //mario collide with powerups (i.e. mushrooms and flowers)
    mario.onCollide('powerup', (obj) => {
        if (obj.is('mushroom')) {
            bigMario = true;
            mario.area.width = 26;
            mario.area.height = 34;
            destroy(obj);
            scoreLabel.value += 1000;
            scoreLabel.text = scoreLabel.value;
            addScoreText(obj, 1000);
        }
        if (obj.is('fire')) {
            fireMario = true;
            destroy(obj);
            mario.area.width = 26;
            mario.area.height = 34;
            scoreLabel.value += 1000;
            scoreLabel.text = scoreLabel.value;
            addScoreText(obj, 1000);
        }
    });

    //MARIO POWER UP, SHOOTING FIRE
    //mario shoots fire on down key if fireMario
    onKeyPress('down', () => {
        if (fireMario) {
            spawnFireball(mario.pos, marioDirection);
            const fireball = play('fireballSound');
            fireball.volume(0.05);
        }
    });

    //fireball generation after mario shoots
    let fireballDirection = 'down';
    onUpdate('fireball', (e) => {
        if (e.pos.y >= 273) {
            fireballDirection = 'up';
        }

        if (e.pos.y <= 260) {
            fireballDirection = 'down';
        }

        if ((e.pos.x < 0) || (e.pos.x > mapWidth)) {
            destroy(e);
        }
        if (fireballDirection === 'down') {
            e.move(e.speed, 40);
        } else {
            e.move(e.speed, -40);
        }

        if (e.pos.y < 255) {
            e.move(10, 220);
        }
    });

    //fireball collision withDANGEROUSitems
    onCollide(DANGEROUS, 'fireball', (item, item2) => {
        if (item.is('goomba')) {
            destroy(item);
            destroy(item2);
        } else if (item.is('koopa')) {
            destroy(item2);
            item.frame = 6;
            item.move(0, 100);
            item.unuse('patrol');
            item.unuse(DANGEROUS);
            item.unuse('solid');
            item.unuse('anim');
        }
    });

    //fireball collision with bricks
    onCollide('fireball', 'brick', (item) => {
        wait(1, destroy(item));
    });

    //bullet enemy movement
    let bulletspeed = 70;
    onUpdate('bullet', (obj) => {
        obj.move(-bulletspeed, 0);
    });

    // CASTLE BACKGROUND
    add([
        sprite('castle'),
        pos(3600, 300),
        layer('bg'),
        origin('bot'),
        scale(0.25)
    ]);

    //GAMEPLAY HEADER TEXT
    // TOP ROW LABELS
    add([
        text('Score', fontObject),
        pos(31, 6),
        fixed()
    ]);
    add([
        text('Coins', fontObject),
        pos(150, 6),
        fixed()
    ]);
    add([
        text('World', fontObject),
        pos(270, 6),
        fixed()
    ]);
    add([
        text('Time', fontObject),
        pos(390, 6),
        fixed()
    ]);
    add([
        text('Lives', fontObject),
        pos(500, 6),
        fixed()
    ]);
    // BOTTOM ROW LABELS
    // SCORE COUNT
    const scoreLabel = add([
        text(score, fontObject),
        pos(31, 30),
        layer('ui'),
        fixed(),
        {
            value: score
        }
    ]);
    // COIN IMAGE & COUNT
    add([
        sprite('coin'), 
        pos(155, 32), 
        layer('ui'), 
        fixed()
    ]);
    const coinCountLabel = add([
        text('x' + count, fontObject),
        pos(180, 30),
        fixed(),
        layer('ui'),
        {
            value: count
        }
    ]);
    // CURRENT LEVEL
    add([
        text('1-' + currentLevel, fontObject),
        pos(285, 30),
        fixed()
    ]);
    // TIME LEFT
    add([
        text(timeLeft, fontObject),
        pos(397, 30),
        layer('ui'),
        fixed(),
        {
            value: time
        },
        'timer'        
    ]);
    // LIVES LEFT
    add([
        text('1', fontObject),
        pos(530, 30),
        fixed()
    ]);
    
    //TIMER CODE
    let timer = get('timer');
    onUpdate(() => {
        currTime = time() - gameLoadTime;
        const timeCheck = Math.floor(currTime / .4);
        if (!levelComplete) {
            if ((400 - timeCheck) < timeLeft) {
                timeLeft--;
                timer[0].text = timeLeft;
                levelPlayTime = 400 - timeLeft;
            }
            if (timeLeft < 1) {
                totalPlayTime = 400 + totalPlayTime;
                go('lose', { score: scoreLabel.value, time: totalPlayTime, level: currentLevel });
            }
        } else {
            if (timeLeft > 0) {
                timeLeft--;
                timer[0].text = timeLeft;
                scoreLabel.value += 50;
                scoreLabel.text = scoreLabel.value;
            }
        }
    });

    // destroy enemies who are off screen left
    let enemies = get(DANGEROUS);
    onUpdate(() => {
        for (let enemy of enemies) {
            if (toScreen(enemy.pos).x < -20) {
                destroy(enemy);
            }
        }
    });

    //END OF LEVEL LOGIC
    //End of level win condition
    let levelComplete = false;

    mario.onCollide('invisible', () => {
        if (!levelComplete) {
            add([
                text('You Beat The Level!', { size: 24 }),
                pos(toWorld(vec2(160, 120))),
                color(255, 255, 255),
                origin('center'),
                layer('ui'),
                music.pause(),
            ]);
            levelComplete = true;
            totalPlayTime = totalPlayTime + levelPlayTime;
            mario.onUpdate(() => {
                if (timeLeft === 0) {
                    wait(1, () => {
                        if (currentLevel >= Levels.length) {
                            go('winner', { score: scoreLabel.value, time: totalPlayTime, level: currentLevel });
                        } else {
                            currentLevel++;
                            go('game', { score: scoreLabel.value, count: coinCountLabel.value, time: 400, mario: mario, levelNumber: currentLevel, totalPlayTime: totalPlayTime }, currentLevel);
                        }
                    });
                }
            });
        }
    });
});


// GAME OVER SCENE
scene('lose', ({ score, time, level }) => {
    // music
    music.pause();
    const gameOverMusic = play('gameOver');

    // game over text
    add([
        text('Game Over', {
            size: 226,
        }),
        origin('center'), 
        pos(center().x, center().y - 100),
        scale(0.25),
        
        gameOverMusic.play(),
        gameOverMusic.volume(0.05)
    ]);
    add([
        text(score, 32), 
        origin('center'), 
        pos(center().x, center().y - 20)
    ]);

    // entering initials to be uploaded to supabase along with score
    add([
        text('Enter your initials and press Enter:'),
        scale(0.25),
        origin('center'),
        pos(center().x, center().y + 60)
    ]);
    let n = add([
        text(''),
        origin('center'),
        pos(center().x, center().y + 125),
        { value: '' }
    ]);
    let maxChar = 3;
    onCharInput((ch) => {
        n.value += ch;
        n.value = n.value.toUpperCase();
        if (n.value.length > maxChar){
            n.value = n.value.slice(0, 2);
        }
    });
    onKeyPress('backspace', () => {
        n.value = n.value.replace(n.value.charAt(n.value.length - 1), '');
    });
    onUpdate(() => {
        n.text = n.value;
    });

    // press enter to upload to supabase and go back to home page
    onKeyPress('enter', async () => {
        await createScore(score, level, n.value, time);
        location.replace('../home-page');
    });
});

// YOU WIN SCENE
scene('winner', ({ score, time, level }) => {
    // you win music
    music.pause();
    const youWinMusic = play('superstar');

    // You Win! text
    add([
        text('You Win!', {
            size: 226,
        }),
        origin('center'), 
        pos(center().x, center().y - 100),
        scale(0.25),
        
        youWinMusic.play(),
        youWinMusic.volume(0.1)
    ]);
    add([
        text(score, 32), 
        origin('center'), 
        pos(center().x, center().y - 20)
    ]);

    // entering initials to be uploaded to supabase along with score
    add([
        text('Enter your initials and press Enter:'),
        scale(0.25),
        origin('center'),
        pos(center().x, center().y + 60)
    ]);
    let n = add([
        text(''),
        origin('center'),
        pos(center().x, center().y + 125),
        { value: '' }
    ]);
    let maxChar = 3;
    onCharInput((ch) => {
        n.value += ch;
        n.value = n.value.toUpperCase();
        if (n.value.length > maxChar){
            n.value = n.value.slice(0, 2);
        }
    });
    onKeyPress('backspace', () => {
        n.value = n.value.replace(n.value.charAt(n.value.length - 1), '');
    });
    onUpdate(() => {
        n.text = n.value;
    });

    // press enter to upload to supabase and go back to home page
    onKeyPress('enter', async () => {
        await createScore(score, level, n.value, time);
        location.replace('../home-page');
    });
});


//initialize start scene - must be at end of game configs
go('start', { score: 0, count: 0, levelNumber: 1 });



// Local Functions
//add score to canvas
function addScoreText(obj, score) {
    add([
        text(score, {
            size: 10,
            width: 35, 
            font: 'sinko', 
        }),
        pos(obj.pos.x, obj.pos.y),
        lifespan(1, { fade: 0.01 })
    ]);
}

// add be careful text to canvas after hitting a mushroom as a big or fire mario
function addCarefulText() {
    add([
        text('Be Careful...', {
            size: 18,
            width: 200, 
            font: 'sinko', 
        }),
        pos(center().x - 85, center().y - 100),
        fixed(),
        lifespan(1.5, { fade: 0.01 })
    ]);
}

//adding the ability forDANGEROUSenemies to patrol an area rather than just walk forward
function patrol(distance = 150, speed = 50, dir = 1) {
    return {
        id: 'patrol',
        require: ['pos', 'area'],
        startingPos: vec2(0, 0),
        add() {
            this.startingPos = this.pos;
            this.on('collide', (obj, side) => {
                if (side.isLeft() || side.isRight()) {
                    dir = -dir;
                }
            });
        },
        update() {
            if (Math.abs(this.pos.x - this.startingPos.x) >= distance) {
                dir = -dir;
            }
            this.move(speed * dir, 0);
        },
    };
}

//adding fireballs to the game scene
function spawnFireball(marioPos, marioDirection) {
    let fireballPos = marioPos;
    if (marioDirection === 'left'){
        fireballPos = marioPos.sub(10, 10);
    } else if (marioDirection === 'right'){
        fireballPos = marioPos.add(10, -10);
    }
    add([
        sprite('fireball'),
        scale(0.5),
        pos(fireballPos),
        origin('center'),
        area(),
        solid(),
        'fireball',
        { speed: marioDirection === 'right' ? 180 : -180 }
    ]);
}

//animation for bumping boxes as mario
function bump(offset = 8, speed = 2, stopAtOrigin = true, isY = true){
    return {
        id: 'bump', 
        require: ['pos'],
        bumpOffset: offset,
        speed: speed,
        bumped: false,
        origPos: 0,
        direction: -1, 
        isY: isY,
        update() {
            if (this.bumped) {
                if (isY){
                    this.pos.y = this.pos.y + this.direction * this.speed;
                    if (this.pos.y < this.origPos - this.bumpOffset) {
                        this.direction = 1;
                    }
                    if (stopAtOrigin && this.pos.y >= this.origPos) {
                        this.bumped = false;
                        this.pos.y = this.origPos;
                        this.direction = -1;
                    }
                } else {this.pos.x = this.pos.x + this.direction * this.speed;
                    if (this.pos.x < this.origPos - this.bumpOffset) {
                        this.direction = 1;
                    }
                    if (stopAtOrigin && this.pos.x >= this.origPos) {
                        this.bumped = false;
                        this.pos.x = this.origPos;
                        this.direction = -1;
                    }
                }
            }
        },
        bump(){
            this.bumped = true;
            if (isY) {
                this.origPos = this.pos.y;
            } else {
                this.origPos = this.pos.x;
            }
        }
    };
}

// Gameboy -> Fullscreen -> Gameboy Functions
async function goFullscreen(e, buttonId) {
    if (buttonId === 'fullscreen') {
        let aspectRatio = 16 / 9;
        let vh = window.innerHeight - 115;
        let vw = window.innerWidth;
        if ((vw / vh) < aspectRatio) {
            canvas.style.width = `${vw}px`;
            canvas.style.height = `${vw / aspectRatio}px`;
            canvas.style.padding = '57.5px 0 0';
            canvas.style.top = '50%';
            canvas.style.transform = 'translate(-50%, -50%)';
            gameboy.classList.add('hidden');
        } else {
            canvas.style.width = `${vh * aspectRatio}px`;
            canvas.style.height = `${vh}px`;
            canvas.style.padding = '0';
            canvas.style.top = '90px';
            gameboy.classList.add('hidden');
        }
        e.path[0].id = 'gameboy';
        e.path[0].textContent = 'Gameboy';
    }
}
async function goGameboy(e, buttonId) {
    if (buttonId === 'gameboy') {
        canvas.style.width = `608px`;
        canvas.style.height = `342px`;
        canvas.style.padding = '70px 54px 440px 42px';
        canvas.style.top = '120px';
        canvas.style.transform = 'translateX(-50%)';
        gameboy.classList.remove('hidden');
        e.path[0].id = 'fullscreen';
        e.path[0].textContent = 'Fullscreen';
    }
}

// mute -> unmute -> mute
async function muteGame(e, buttonId) {
    if (buttonId === 'mute') {
        volume(0.0);
        e.path[0].id = 'unmute';
        e.path[0].textContent = 'Unmute';
    }
}
async function unmuteGame(e, buttonId) {
    if (buttonId === 'unmute') {
        volume(1);
        e.path[0].id = 'mute';
        e.path[0].textContent = 'Mute';
    }
}

// fixes FPS at 60
function checkIfNewFrame(currTime, currFrame) {
    if (Math.floor(currTime / (1 / 60)) > currFrame) {
        currFrame++;
    }
    return currFrame;
}

// GLIDE FUNCTIONS - moves mario according to glide speed & decreases glide speed each time function is called
// It's kind of unavoidable in game code, but this code is very challenging to read. Two suggestions i have: store your number in named constants (const MEDIUM_GLIDE = 50, or whatever) and add comments. If I were tasked with maintaining this code, i would be very scared to touch this function for fear of unpredictable consequences. Any bugs in this code would probably last a long time. In situations like this, writing tests is absolutely crucial--otherwise this function becomes untouchable.
function marioLeftGlide(marioLeftGlideSpeed, mario) {
    if (marioLeftGlideSpeed > 100) {
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftGlideSpeed, 0);
        }
        return marioLeftGlideSpeed = marioLeftGlideSpeed - 6;
    } else if (marioLeftGlideSpeed > 50) {
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftGlideSpeed, 0);
        }
        return marioLeftGlideSpeed = marioLeftGlideSpeed - 5;
    } else if (marioLeftGlideSpeed > 20) {
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftGlideSpeed, 0);
        }
        return marioLeftGlideSpeed = marioLeftGlideSpeed - 3;
    } else if (marioLeftGlideSpeed > 4) {
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftGlideSpeed, 0);
        }
        return marioLeftGlideSpeed = marioLeftGlideSpeed - 2;
    } else if (marioLeftGlideSpeed > 0) {
        if (toScreen(mario.pos).x > 10) {
            mario.move(-marioLeftGlideSpeed, 0);
        }
        return marioLeftGlideSpeed = marioLeftGlideSpeed - 1;
    } else if (marioLeftGlideSpeed < 0) {
        return marioLeftGlideSpeed = 0;
    }
}
function marioRightGlide(marioRightGlideSpeed, mario) {
    if (marioRightGlideSpeed > 100) {
        mario.move(marioRightGlideSpeed, 0);
        return marioRightGlideSpeed = marioRightGlideSpeed - 6;
    } else if (marioRightGlideSpeed > 50) {
        mario.move(marioRightGlideSpeed, 0);
        return marioRightGlideSpeed = marioRightGlideSpeed - 5;
    } else if (marioRightGlideSpeed > 20) {
        mario.move(marioRightGlideSpeed, 0);
        return marioRightGlideSpeed = marioRightGlideSpeed - 3;
    } else if (marioRightGlideSpeed > 4) {
        mario.move(marioRightGlideSpeed, 0);
        return marioRightGlideSpeed = marioRightGlideSpeed - 2;
    } else if (marioRightGlideSpeed > 0) {
        mario.move(marioRightGlideSpeed, 0);
        return marioRightGlideSpeed = marioRightGlideSpeed - 1;
    } else if (marioRightGlideSpeed < 0) {
        return marioRightGlideSpeed = 0;
    }
}


// SLOWING DOWN MARIO FUNCTIONS - slows down mario if he's idle or moving in the opposite direction
function slowMarioRightSpeed(marioRightSpeed, lastMarioXPos, currMarioXPos) {
    // SLOWING DOWN SPEED BECAUSE MARIO IS IDLE
    if (marioRightSpeed > 20 && lastMarioXPos === currMarioXPos) {
        marioRightSpeed = marioRightSpeed - 4;
    }
    // IF MARIO IS MOVING LEFT, SLOW DOWN RIGHT SPEED
    if (marioRightSpeed > 20 && lastMarioXPos > currMarioXPos) {
        marioRightSpeed = 0;
    }
}
function slowMarioLeftSpeed(marioLeftSpeed, lastMarioXPos, currMarioXPos) {
    // SLOWING DOWN SPEED BECAUSE MARIO IS IDLE
    if (marioLeftSpeed > 20 && lastMarioXPos === currMarioXPos) {
        return marioLeftSpeed = marioLeftSpeed - 4;
    }
    // IF MARIO IS MOVING RIGHT, SLOW DOWN LEFT SPEED
    if (marioLeftSpeed > 20 && lastMarioXPos < currMarioXPos) {
        return marioLeftSpeed = 0;
    }
}

//displaying header at the top of the page
async function fetchAndDisplayHeader(profile) {
    const hardHeader = document.querySelector('header');
    bodyDOM.removeChild(hardHeader);
    const header = renderMarioHeader(profile);
    bodyDOM.prepend(header);
}


// EVENT LISTENERS (for page)
window.addEventListener('load', async ()=> {
    const profile = await getMyProfile();
    if (!profile.username) {
        location.replace('../profile-setup');
    }
    await fetchAndDisplayHeader(profile);
    canvas = document.querySelector('canvas');
    window.canvas.focus();
    loadingScreen.classList.add('invisible');

});