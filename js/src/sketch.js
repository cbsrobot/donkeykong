'use strict';

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

//Imports P5. Instantiates the sketch at the bottom of this file.
const p5 = require('p5');
require('./node_modules/p5/lib/addons/p5.sound');

const { ipcRenderer } = require('electron');

//Imports our custom function to decide what color the fill shall be.
//const { getFillColor } = require('./js/src/colorController');

let canvas
let jumpSound, theme
let platXsT, platYsT, ladderXsT, ladderYsT
let platXs, platYs, ladderXs, ladderYs
let platXEnds

let debug = false;

let STARTSCREEN = 1;
let GAME = 2;
let CONTINUESCREEN = 3;
let GAMEOVER = 4;
let BATTERY1 = 5;
let BATTERY2 = 6;
let BATTERY3 = 7;

let goLeft = false;
let goRight = false;
let jump = false;
let climb = false;
let descend = false;
let lifeLost = false;
let canClimb = false; //if you can climb something, ie. a ladder, then it is true
let winAnim = false;
let climbAnimDelay = 0;
let frame = 0;
let climbAnim = 0;
let lives = 3; //how many lives you have
let points = 0;
let pointFader = 0;
let level = 1;
let state = STARTSCREEN;

let marioX = 15;
let marioY = 575;
let marioXVel = 0;
let marioYVel = 0;
let mGravity = 0.1;

let DKX = 50; //donkey kongs x location
let DKY; //donkey kong's y location
let DKBashChestStall = 0; //stalls the imgae transition
let DKBashChest = 0; //makes image transition to show dk bashing his chest

let peachX = 265;
let peachY = 10;
let platformWidth = 15; //width of platform
let platformLength = 400; //length of a platform
let MLEN = 30; // length and width of Mario
let MOFF = 15; // y offset of mario
let BLEN = 25; // length and width of a barrel
//let let MLEN = 20; // length and width of Mario
//let let BLEN = 20; // length and width of a barrel
let BRAD = 12.5; //radius of a barrel
let ABOVEBRRL = 60; //height between barrel and bottom of next platform
let LWID = 30; // width of a ladder
let LHEIGHT = 100; //height of ladder
let DKLEN = 72; //width of DK

let LFT = 1;
let RGHT = 2;
let CLMB = 3;

let facing = LFT;
let DKFace = LFT;

let brrlSpin = 0; //transitions through four barrel images to make barrel "spin"
let brrlSpinStall = 0; //delays the trasition of images
let gravity = 0.1;

let platI, marioLeft, marioRight, jumpLeft, jumpRight, climbRight, climbLeft
let brrl1, brrl2, brrl3, brrl4, lddr, leftDK, rightDK, throwDK, peach, peachPlat
let startScrn, earthindex, earth1, earth2, earth3, earth4
let battery1, battery2, battery3, battery4

let a = 15
let yBars = new Array(a)
let xBars = new Array(a)
let yBarVels = new Array(a); //barrels xs and ys and velocities 
let xBarVels = new Array(a);
let xBarCen = new Array(a);
let yBarCen = new Array(a); //centers of the barrels

let PixelEmulator

let lastMessageTs = 0
let messagesTs = []
let messagesAverage = 0;

//Starting out sketch and
//injecting p5, as the param p, into our sketch function.
const sketch = (p) => {

  p.preload = () => {
    jumpSound = p.loadSound("assets/jump.mp3")
    theme = p.loadSound("assets/DKTheme.mp3")
    PixelEmulator = p.loadFont("assets/PixelEmulator.ttf")
  }

  p.setup = () => {
    // Create the canvas
    //p.createCanvas(p.windowWidth, p.windowHeight);
    canvas = p.createCanvas(520, 700);
    //canvas.style('display', 'block');
    
    platXsT = [
      (400,590)
    ]

    platXsT = [
        400,
        0,
        0,
        100,
        0,
        100,
        0,
        -400,
        -800,
        -1200,
        -1600,
        -2000,
        -2400,
        -2800
    ]
    
    platYsT = [ // the bottom platform is made up of 2 platforms due to the size of the image,the top platform is made up of 7platforms to make a spawning area offscreen for barrels
      590,
      590,
      490,
      390,
      290,
      190,
      90,
      90,
      90,
      90,
      90,
      90,
      90,
      90
    ]
    
    ladderXsT = [
      350,
      170,
      350,
      170,
      350,
      195,
      235
    ]

    ladderYsT = [
      490,
      390,
      290,
      190,
      90,
      -10,
      -10
    ]
    
    platYs = platYsT;
    platXs = platXsT;
    ladderXs = ladderXsT;
    ladderYs = ladderYsT;
    platXEnds = [];
    p.setupImages();
    p.resetArrays();
    //state = GAME;
    //facing = LFT;
    //DKFace = LFT;
    p.textFont('PixelEmulator');
    p.textSize(14);
    p.fill(255, 255, 255);
    earthindex = 1
  };

  p.messagesTsPush = (value) => {
    messagesTs.push(value)
    if (messagesTs.length > 24 ) {
      messagesTs.shift()
    }
    messagesAverage = messagesTs.reduce((a, b) => a + b, 0) / messagesTs.length;
  }

  p.lastMessageDelta = () => {
    return Date.now() - lastMessageTs;
  }

  ipcRenderer.on('gpio', (event, message) => {
    // ipcMain only sends if val == 1
    p.messagesTsPush(p.lastMessageDelta())
    lastMessageTs = Date.now()
  })


  p.checkLastMessageTs = () => {
    if (p.lastMessageDelta() > 10000 ){
      state = BATTERY1
    } else if (messagesAverage > 600 ){ //300
      // not enough power
      state = BATTERY2
    } else if (messagesAverage > 300 ){ //150
      // still not enough power
      state = BATTERY3
    } else if (state == BATTERY1 || state == BATTERY2 || state == BATTERY3) {
      state = STARTSCREEN
    }

    if (frame % 50 === 0 && p.lastMessageDelta() > 600) {
      // fill array with 1000 if needed
      p.messagesTsPush(1000)
    }
  }
  
  
  p.draw = () => {
    //let fillColor = getFillColor(p.mouseIsPressed);
    //p.fill(fillColor)
    //p.ellipse(p.mouseX, p.mouseY, 80, 80);
    frame = frame > 1200 ? 0 : frame + 1

    p.background(0);
    p.checkLastMessageTs();

    p.textAlign(p.CENTER);
    if (state == BATTERY1) {
      p.fill(255, 255, 255);
      if (Math.floor(frame / 60 % 2)) {
        p.image(battery1, 160, 100);
      } else {
        p.image(battery2, 160, 100);
      }
      p.text("TRETEN SIE IN DIE PEDALEN UM ZU SPIELEN", 260, 360);
      p.text("PÉDALEZ POUR JOUER", 260, 400);
      p.text("PEDAL TO PLAY", 260, 440);
    }

    if (state == BATTERY2) {
      p.fill(255, 255, 255);
      if (Math.floor(frame / 60 % 2)) {
        p.image(battery2, 160, 100);
      } else {
        p.image(battery3, 160, 100);
      }
      p.text("TRETEN SIE SCHNELLER", 260, 360);
      p.text("PÉDALEZ PLUS VITE", 260, 400);
      p.text("PEDAL FASTER", 260, 440);
    }

    if (state == BATTERY3) {
      p.fill(255, 255, 255);
      if (Math.floor(frame / 60 % 2)) {
        p.image(battery3, 160, 100);
      } else {
        p.image(battery4, 160, 100);
      }
      p.text("NOCH ETWAS SCHNELLER", 260, 360);
      p.text("ENCORE PLUS VITE", 260, 400);
      p.text("EVEN FASTER", 260, 440);
    }
    
    if (state == STARTSCREEN) {
      p.fill(255, 255, 255);
      p.image(startScrn, 25, 59.5);
      p.text("KLICKEN SIE AUF EINEN KNOPF, UM ZU SPIELEN", 260, 450);
      p.text("CLIQUEZ SUR N'IMPORTE QUEL BOUTON POUR JOUER", 260, 490);
      p.text("CLICK ANY BUTTON TO PLAY", 260, 530);
    }
    p.textAlign(p.LEFT);
    
    if (state == GAME) { //if you are playing, 
      //if (!theme.isPlaying())
      //  theme.loop()
      p.play(); //play game
    }
    if (state == CONTINUESCREEN) { //if you die or win a level, go to the continue screen
      p.continueScreen();
    }
    if (state == GAMEOVER) { //if you lose display this screen
      p.textAlign(p.CENTER);
      //if (theme.isPlaying())
      //  theme.stop()
      p.fill(255, 255, 255);
      p.text("GAMEOVER", 260, 250);
      p.text("PUNKTE / POINTS: " + points, 260, 290);
      p.text("KLICKEN SIE AUF EINEN KNOPF, UM ZU SPIELEN", 260, 450);
      p.text("CLIQUEZ SUR N'IMPORTE QUEL BOUTON POUR JOUER", 260, 490);
      p.text("CLICK ANY BUTTON TO PLAY", 260, 530);
      p.textAlign(p.LEFT);
    }
  };

  //p.windowResized = () => {
  //  p.resizeCanvas(p.windowWidth, p.windowHeight);
  //}
  
  p.mouseClicked = () => {
    if (state == STARTSCREEN) {
      state = GAME
    }
    if (state == GAMEOVER) {
      p.resetGame()
      state = STARTSCREEN
    }
  }
  
  p.keyPressed = (event) => {
    let key = event.key

    if (state == STARTSCREEN) {
      state = GAME
      return
    }
    if (state == GAMEOVER) {
      p.resetGame()
      state = STARTSCREEN
      return
    }
    
    if (key == 'd') {
      if (marioX < p.windowWidth - MLEN) {
        if (!climb) { //if you are not climbing
          goRight = true; //go go right
          facing = RGHT;
        }
      }
    }

    if (key == 'a') {
      if (marioX > 0) {
        if (!climb) { //if you are not climbing
          goLeft = true; //go left
          facing = LFT;
        }
      }
    }
    if (key == ' ') {
      if (state == GAME) { //if LEVELONE or LEVELTWO jump
        if (!climb) //if you are not climbing 
          if (!jump) { //and you have not jumped yet
            jump = true; //jump
            marioYVel = -3;
            //jumpSound.rewind();
            //if (jumpSound.isPlaying())
            //  jumpSound.stop();
            //jumpSound.play();
          }
      }
      if (state == CONTINUESCREEN) //restart level one
        state = GAME;
    }
    if (key == 'w') {
      if (canClimb) { //if you can climb then climb
        climb = true;
        facing = CLMB;
        goRight = false; //stop left and right motion, only can go up or down
        goLeft = false;
        jump = false;
      }
    }
    if (key == 's') {
      if (canClimb) { //if you can climb then climb
        descend = true;
        facing = CLMB;
        goRight = false; //stop left and right motion, only can go up or down
        goLeft = false;
        jump = false;
      }
    }
  }
  
  p.keyReleased = (event) => { //if you let go of the key instead of if you press it
    let key = event.key
    if (key == 'd') {
      goRight = false;
    }
    if (key == 'a') {
      goLeft = false;
    }
    if (key == 'w') {
      climb = false;
    }
    if (key == 's') {
      descend = false;
    }
  }
  
  
  p.drawBarrels = () => {
    brrlSpinStall++;
    if (brrlSpinStall % 5 == 0)
      brrlSpin++;
    for (let i = 0; i < xBars.length; i++) {
      if (brrlSpin % 4 == 0)
        p.image(brrl1, xBars[i], yBars[i]);
      if (brrlSpin % 4 == 1)
        p.image(brrl2, xBars[i], yBars[i]); //makes the barrels spin
      if (brrlSpin % 4 == 2)
        p.image(brrl3, xBars[i], yBars[i]);
      if (brrlSpin % 4 == 3)
        p.image(brrl4, xBars[i], yBars[i]);
      if (debug == true) {
        p.noFill();
        //marioX + MLEN > xBars[i] && marioX < xBars[i] + BLEN
        //marioY < yBars[i] + BLEN && marioY + MLEN > yBars[i]
        p.strokeWeight(2);
        p.stroke(0, 255, 0);
        p.ellipse(xBars[i], yBars[i], 1, 1);
        p.stroke(255, 0, 0);
        p.ellipse(xBars[i] + BLEN, yBars[i] + BLEN, 1, 1);
        p.noStroke()
      }
    }
  }
  
  p.moveBarrels = () => {
    for (let i = 0; i < yBarVels.length; i++) { // 
      yBars[i] += yBarVels[i]; //always add the y velocity to the barrel
      yBarVels[i] = yBarVels[i] + gravity; //always make gravity affect the barrels
      xBars[i] = xBars[i] + xBarVels[i]; //move the barrels side to side
      if (yBarVels[i] >= 0) // barrel is falling down or on a platform
        for (let j = 0; j < platYs.length; j++) { // check to see if it hits a platform
          if (yBars[i] + 25 - yBarVels[i] <= platYs[j] && yBars[i] + 25 >= platYs[j]) {
            if (xBars[i] + 25 >= platXs[j] && xBars[i] < platXEnds[j]) {
              yBars[i] = platYs[j] - 25; //put it on the platform
              yBarVels[i] = 0;
            }
          }
        }
      // bounce a barrel when it hits the walls -- only bounce when approach a wall from the center
      if (xBars[i] >= 500 && xBarVels[i] > 0 || xBars[i] <= 0 && xBarVels[i] < 0)
        xBarVels[i] = xBarVels[i] * -1;

      // respawn a barrel at the top if it's below the 2nd to last platform
      if (xBars[i] <= 0 && yBars[i] > platYs[2]) {
        yBars[i] = platYs[platYs.length - 1] - BLEN;
        xBars[i] = 0;
      }
    }
  }

  p.drawDK = () => {
    DKBashChestStall++;
    if (DKBashChestStall % 25 == 0)
      DKBashChest++;
    if (DKBashChest % 2 == 0)
      DKFace = RGHT;
    else
      DKFace = LFT; //animates dk bashing his chest
    if (DKFace == RGHT)
      p.image(rightDK, DKX, DKY);
    if (DKFace == LFT)
      p.image(leftDK, DKX, DKY);
  }
  
  p.runAwayDK = () => {
    if (DKX < 200)
      DKX += 1;
    if (DKX == 200) { //makes dk go out of the screen when you reach the top
      DKY -= 1;
      peachX = DKX + DKLEN;
      peachY = DKY + 20;
      DKFace = LFT;
    }
    if (DKY < -50) {
      level = level + 1;
      points += 500;
      state = CONTINUESCREEN; //once he reaches the top, make the level go to the next level
      winAnim = false;
    }
  }
  
  p.drawPeach = () => {
    p.image(peach, peachX, peachY);
  }

  p.drawEarth = () => {
    if (frame % 24 == 0)
      earthindex = earthindex > 3 ? 1 : earthindex + 1
    p.image(eval("earth" + earthindex), peachX, peachY);
  }


  p.play = () => {
    p.drawLadders();
    p.setupScreen();
    p.drawBarrels(); //makes the game play
    p.moveBarrels();
    p.checkIfMarioGetsHit();
    p.checkIfYouGetsPoints();
    p.drawDK();
    //p.drawPeach();
    p.drawEarth();
    p.drawMario(marioX, marioY);
    p.moveMario();
    if (marioX + MLEN < 330) {
      if (marioY < platYs[platYs.length - 1]) {
        p.runAwayDK();
        winAnim = true;
        for (let i = 0; i < xBarVels.length; i++)
          xBarVels[i] = 0;
      }
    }
  }
  
  p.continueScreen = () => { //screen that shows when you are hit by a barrel or when you complete a level
    p.fill(255);
    p.textAlign(p.CENTER);
    //p.text("SPACE TO CONTINUE", 250, 250);
    p.text("LEBEN / VIES / LIVES", 260, 250);
    for (let i = 0; i < lives; i++) {
      p.push();
      p.translate(i * 25 + 240, 270);
      p.scale(.5);
      p.image(marioLeft, 0, 0);
      p.pop();
    }
    pointFader = 0;
    p.text("KLICKEN SIE AUF EINEN KNOPF, UM ZU SPIELEN", 260, 450);
    p.text("CLIQUEZ SUR N'IMPORTE QUEL BOUTON POUR JOUER", 260, 490);
    p.text("CLICK ANY BUTTON TO PLAY", 260, 530);
    p.textAlign(p.LEFT);
    p.resetArrays();
  }

  p.drawLadders = () => {
    for (let i = 0; i < ladderXs.length; i++) {
      p.image(lddr, ladderXs[i], ladderYs[i]); //draws image of ladder at the spot
      if (debug) {
        p.stroke(0, 255, 0);
        p.ellipse(ladderXs[i], ladderYs[i], 1, 1);
        p.stroke(255, 0, 0);
        p.ellipse(ladderXs[i] + LWID, ladderYs[i] + LHEIGHT, 1, 1);
        //marioX + MLEN > xBars[i] && marioX < xBars[i] + BLEN
        //marioY < yBars[i] + BLEN && marioY + MLEN > yBars[i]
        p.noStroke()
      }
      
      //check if mario is on a ladder
      if (marioY < ladderYs[i] + LHEIGHT && marioY + MLEN > ladderYs[i]) { //if mario is at the level of the ladder
        if (marioX + MLEN > ladderXs[i] && marioX < ladderXs[i] + LWID) { //if x value is in ladder
          canClimb = true;
        } else {
          canClimb = false;
          mGravity = 0.1;
        }
      }
      if (marioY < ladderYs[ladderYs.length - 1]) //fixes the bug where the top ladder is infinite
        canClimb = false;
      mGravity = 0.1;
    }
  }

  p.drawMario = (x, y) => {
    p.fill(250, 255, 255, pointFader);
    p.text("100", marioX, marioY + MLEN + 10);
    if (facing == LFT)
      if (jump)
        p.image(jumpLeft, x, y - MOFF);
      else
        p.image(marioLeft, x, y - MOFF);
    if (facing == RGHT)
      if (jump)
        p.image(jumpRight, x, y - MOFF);
      else
        p.image(marioRight, x, y - MOFF);
    if (facing == CLMB) {
      if (climbAnim % 2 == 0)
        p.image(climbRight, x, y - MOFF);
      else
        p.image(climbLeft, x, y - MOFF);
    }
    if (debug) {
      p.stroke(0, 255, 0);
      p.ellipse(x, y - MOFF, 1, 1);
      p.stroke(255, 0, 0);
      p.ellipse(x + MLEN, y + MLEN - MOFF, 1, 1);
      //marioX + MLEN > xBars[i] && marioX < xBars[i] + BLEN
      //marioY < yBars[i] + BLEN && marioY + MLEN > yBars[i]
      p.noStroke()
    }
  }
  
  p.moveMario = () => {
    if (!winAnim) {
      if (goLeft) {
        if (marioX > 0) {
          marioXVel = -2; //make him go left
        } else {
          goLeft = false;
        }
      }
      if (goRight) {
        if (marioX < p.windowWidth - MLEN) {
          marioXVel = 2; //make him go right
        } else {
          goRight = false;
        }
      }
      if (climb) {
        marioYVel = -2;
        climbAnimDelay++;
        if (climbAnimDelay % 10 == 0) //animates the mario as if climbing, but delays the switch between images 
          climbAnim++;
      }
      if (descend) {
        marioYVel = 2;
        climbAnimDelay++;
        if (climbAnimDelay % 10 == 0) //same as climb but down
          climbAnim++;
      }
      if (canClimb && !climb && !descend && !jump)
        marioYVel = 0;;
      if (!goRight && !goLeft)
        marioXVel = 0;
      marioY = marioY + marioYVel; //make him go up or down
      marioYVel = marioYVel + mGravity; //slowy change the up motion to a down motion, much like gravity
      marioX = marioX + marioXVel;
      if (marioYVel >= 0) // mario is falling down or on a platform
        for (let i = 0; i < platYs.length; i++) { // check to see if he hits a platform
          if (marioY + 15 - marioYVel <= platYs[i] && marioY + 15 >= platYs[i]) {
            if (marioX + 30 >= platXs[i] && marioX < platXEnds[i]) {
              marioY = platYs[i] - 15;
              marioYVel = 0;
              jump = false;
            }
          }
        }
      if (!canClimb) {
        climb = false;
        // descend=false;
      }
      if (lives == 0)
        state = GAMEOVER;
    }
  }
  
  p.checkIfMarioGetsHit = () => { //checks to see if mario gets hit
    if (!lifeLost) {
      for (let i = 0; i < yBarVels.length; i++) {
        // check to see if barrel hits Mario
        if (marioX + MLEN > xBars[i] && marioX < xBars[i] + BLEN) {
          if (marioY - MOFF < yBars[i] + BLEN && marioY - MOFF + MLEN > yBars[i]) {
            lives = lives - 1;
            points -= 100;
            state = CONTINUESCREEN;
          }
        }
      }
    }
  }
  
  p.checkIfYouGetsPoints = () => { //checks to see if mario should get points
    if (!winAnim) {
      if (jump) {
        if (pointFader == 0) {
          for (let i = 0; i < yBarVels.length; i++) {
            if (marioX + MLEN > xBars[i] && marioX < xBars[i] + BLEN) {
              if (marioY < yBars[i] && marioY + MLEN > yBars[i] - ABOVEBRRL) {
                points += 100;
                pointFader = 255;
              }
            }
          }
        }
      }
    }
    if (pointFader > 0)
      pointFader -= 5;
  }
  
  p.setupImages = () => {
    platI = p.loadImage("assets/kongPlat.jpg");
    marioLeft = p.loadImage("assets/marioGoingLeft.gif");
    marioRight = p.loadImage("assets/marioGoingRight.gif");
    jumpLeft = p.loadImage("assets/marioJumpLeft.gif");
    jumpRight = p.loadImage("assets/marioJumpRight.gif");
    climbRight = p.loadImage("assets/marioClimbR.gif");
    climbLeft = p.loadImage("assets/marioClimbL.gif");
    brrl1 = p.loadImage("assets/barrelImage.gif");
    brrl2 = p.loadImage("assets/barrelImage2.gif");
    brrl3 = p.loadImage("assets/barrelImage3.gif");
    brrl4 = p.loadImage("assets/barrelImage4.gif");
    lddr = p.loadImage("assets/kongLadder.png");
    leftDK = p.loadImage("assets/DK1.gif");
    rightDK = p.loadImage("assets/DK2.gif");
    throwDK = p.loadImage("assets/donkeyKong3.png");
    peach = p.loadImage("assets/peach.gif");
    peachPlat = p.loadImage("assets/peachPlat.jpg");
    startScrn = p.loadImage("assets/startScreen.png");
    earth1 = p.loadImage("assets/earth_01.png");
    earth2 = p.loadImage("assets/earth_02.png");
    earth3 = p.loadImage("assets/earth_03.png");
    earth4 = p.loadImage("assets/earth_04.png");
    battery1 = p.loadImage("assets/battery_01.png");
    battery2 = p.loadImage("assets/battery_02.png");
    battery3 = p.loadImage("assets/battery_03.png");
    battery4 = p.loadImage("assets/battery_04.png");
  }
  
  p.resetArrays = () => {
    for (let i = 0; i < yBars.length; i++)
      yBars[i] = platYs[platYs.length - 1] - 25;
    for (let i = 0; i < xBars.length; i++)
      xBars[i] = -i * 200;
    for (let i = 0; i < yBarVels.length; i++)
      yBarVels[i] = 0;
    for (let i = 0; i < xBarVels.length; i++)
      xBarVels[i] = 1 + Math.pow(1.1, level - 1);
    for (let i = 0; i < yBars.length; i++)
      yBarCen[i] = yBars[i] + BRAD;
    for (let i = 0; i < xBars.length; i++)
      xBarCen[i] = xBars[i] + BRAD;
    DKY = platYs[platYs.length - 1] - 50;
    DKX = 50;
    marioX = 15;
    marioY = 575;
    peachX = 265;
    peachY = 10;
    winAnim = false;
  }
  
  p.resetGame = () => {
    p.resetArrays()
    lives = 3; //how many lives you have
    points = 0;
    pointFader = 0;
    level = 1;
  }
  
  p.setupScreen = () => {
    for (let i = 0; i < platXs.length; i++) {
      p.fill(255, 0, 0);
      p.image(platI, platXs[i], platYs[i]);
    }
    p.image(peachPlat, 265, 40);
    for (let i = 0; i < platXs.length; i++)
      platXEnds[i] = platXs[i] + 400;
    for (let i = 0; i < lives; i++) {
      p.push();
      p.scale(.5);
      p.image(marioLeft, i * 25, 25);
      p.pop();
    }
    p.fill(255);
    p.text("LEVEL: " + level, 320, 25);
    p.text("POINTS: " + points, 320, 40);
  }

}

//Instantiates P5 sketch to keep it out of the global scope.
const app = new p5(sketch);

window.onload = () => {
  this.focus()
}
