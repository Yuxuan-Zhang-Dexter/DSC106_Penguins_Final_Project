<script>
    import { onMount } from 'svelte';
  
    let game_W = 20;
    let game_H = 20;
    let XXX = 0, YYY = 0, Xh = 0, Yh = 0;
    let MaxLeng = 0;
    let speedReturn = 0;
    let R = 0, r = 0;
    let drag = false;
    let d = false;
    let ok = false;
    let angle = 90;
    let ChAngle = -1;
    let index = -1;
    let level = -1;
    let time = 60;
    let tager = 0;
    let timeH = 0;
    let vlH = 0;
    let canvas;
    let context;
    let score = 0;
    let N = -10;
    let gameState = 'stop'; // possible values: 'stop', 'running', 'paused'
  
    const images = {
      bg: "./assets/background.png",
      hook: "./assets/hook.png",
      targetIM: "./assets/target.png",
      dolarIM: "./assets/dolar.png",
      levelIM: "./assets/level.png",
      clockIM: "./assets/clock.png",
      goldIm: "./assets/gold.png",
      rockIm: "./assets/rock.png",
      diamondIM: "./assets/diamond.png",
    };
  
    const loadedImages = {};
    let imagesLoaded = false;
  
    function loadImages(sources, callback) {
      let loadedCount = 0;
      const totalCount = Object.keys(sources).length;
  
      for (const key in sources) {
        loadedImages[key] = new Image();
        loadedImages[key].src = sources[key];
        loadedImages[key].onload = () => {
          loadedCount++;
          console.log(`Image loaded: ${sources[key]}`);
          if (loadedCount === totalCount) {
            imagesLoaded = true;
            console.log("All images loaded");
            callback();
          }
        };
        loadedImages[key].onerror = () => {
          console.error(`Failed to load image: ${sources[key]}`);
        };
      }
    }
  
    class Gold {
      constructor(game) {
        this.game = game;
        this.init();
      }
  
      init() {
        this.type = Math.floor(Math.random() * 100000) % 8;
        this.x = 2 * this.game.getWidth() + Math.random() * (game_W - 4 * this.game.getWidth());
        this.y = 2 * this.game.getWidth() + game_H / 3 + Math.random() * (2 * game_H / 3 - 4 * this.game.getWidth());
        this.alive = true;
        this.update();
      }
  
      update() {
        switch (this.type) {
          case 0:
            this.speed = this.game.getWidth() / 5;
            this.width = this.game.getWidth();
            this.height = this.game.getWidth() / 2;
            this.IM = loadedImages.goldIm;
            this.score = 50;
            break;
          case 1:
            this.speed = this.game.getWidth() / 8;
            this.width = 1.5 * this.game.getWidth();
            this.height = 1.5 * this.game.getWidth() / 2;
            this.IM = loadedImages.goldIm;
            this.score = 100;
            break;
          case 2:
            this.speed = this.game.getWidth() / 20;
            this.width = 2.5 * this.game.getWidth();
            this.height = 2.5 * this.game.getWidth() / 2;
            this.IM = loadedImages.goldIm;
            this.score = 250;
            break;
          case 3:
            this.speed = this.game.getWidth() / 15;
            this.width = 1.5 * this.game.getWidth();
            this.height = 1.5 * this.game.getWidth();
            this.IM = loadedImages.rockIm;
            this.score = 11;
            break;
          case 4:
            this.speed = this.game.getWidth() / 40;
            this.width = 1.8 * this.game.getWidth();
            this.height = 1.8 * this.game.getWidth();
            this.IM = loadedImages.rockIm;
            this.score = 20;
            break;
          case 5:
            this.speed = this.game.getWidth() / 65;
            this.width = 2 * this.game.getWidth();
            this.height = 2 * this.game.getWidth();
            this.IM = loadedImages.rockIm;
            this.score = 30;
            break;
          case 6:
          case 7:
            this.speed = this.game.getWidth() / 2.5;
            this.width = this.game.getWidth() / 2;
            this.height = this.game.getWidth() / 2.5;
            this.IM = loadedImages.diamondIM;
            this.score = 600;
            break;
        }
      }
  
      randomXY() {
        this.x = 2 * this.game.getWidth() + Math.random() * (game_W - 4 * this.game.getWidth());
        this.y = 2 * this.game.getWidth() + game_H / 3 + Math.random() * (2 * game_H / 3 - 4 * this.game.getWidth());
      }
  
      draw() {
        if (this.IM) {
          if (this.game.context) {
            this.game.context.drawImage(this.IM, this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
          } else {
            console.error("Context is not defined");
          }
        } else {
          console.error(`Image for type ${this.type} is not loaded yet`);
        }
      }
  
      size() {
        return Math.sqrt(this.width * this.width + this.height * this.height) / 2;
      }
    }
  
    class Game {
      constructor() {
        this.score = 0;
        this.init();
      }
  
      init() {
        canvas = document.createElement("canvas");
        context = canvas.getContext("2d");
        if (!context) {
          console.error("Failed to get 2D context");
          return;
        }
        document.body.appendChild(canvas);
  
        this.context = context;
  
        this.render();
        this.newGold();
        this.initGold();
        this.loop();
        this.listenKeyboard();
        this.listenMouse();
      }
  
      newGold() {
        ok = false;
        index = -1;
        Xh = XXX;
        Yh = YYY;
        r = R;
        drag = false;
        timeH = -1;
        vlH = 0;
        time = 60;
        level++;
        tager = (level + 1) * 1000 + level * level * 120;
        this.initGold();
      }
  
      listenKeyboard() {
        document.addEventListener("keydown", () => {
          this.solve();
        });
      }
  
      listenMouse() {
        canvas.addEventListener("mousedown", () => {
          this.solve();
        });
      }
  
      solve() {
        if (!drag) {
          drag = true;
          d = true;
          speedReturn = this.getWidth() / 2;
          index = -1;
        }
      }
  
      loop() {
        if (imagesLoaded && gameState === 'running') {
          this.update();
          this.draw();
          if (time > 0 || this.score > tager) setTimeout(() => this.loop(), 10);
          if (time <= 0 || this.checkWin()) {
            if (this.score >= tager || this.checkWin()) this.newGold();
            else {
              window.alert("You lose!" + "\n" + "Your Score: " + this.score);
              location.reload();
            }
          }
        } else {
          setTimeout(() => this.loop(), 10);
        }
      }
  
      update() {
        this.render();
        time -= 0.01;
        Xh = XXX + r * Math.cos(this.toRadian(angle));
        Yh = YYY + r * Math.sin(this.toRadian(angle));
        if (!drag) {
          angle += ChAngle;
          if (angle >= 165 || angle <= 15) ChAngle = -ChAngle;
        } else {
          if (r < MaxLeng && d && !ok) r += this.getWidth() / 5;
          else {
            d = false;
            r -= speedReturn / 2.5;
          }
          if (r < R) {
            r = R;
            drag = false;
            ok = false;
            index = -1;
            for (let i = 0; i < N; i++)
              if (this.gg[i].alive && this.range(Xh, Yh, this.gg[i].x, this.gg[i].y) <= 2 * this.getWidth()) {
                this.gg[i].alive = false;
                this.score += this.gg[i].score;
                timeH = time - 0.7;
                vlH = this.gg[i].score;
              }
          }
        }
        if (drag && index == -1) {
          for (let i = 0; i < N; i++)
            if (this.gg[i].alive && this.range(Xh, Yh, this.gg[i].x, this.gg[i].y) <= this.gg[i].size()) {
              ok = true;
              index = i;
              break;
            }
        }
        if (index != -1) {
          this.gg[index].x = Xh;
          this.gg[index].y = Yh + this.gg[index].height / 3;
          speedReturn = this.gg[index].speed;
        }
      }
  
      render() {
        if (game_W != document.documentElement.clientWidth || game_H != document.documentElement.clientHeight) {
          canvas.width = document.documentElement.clientWidth;
          canvas.height = document.documentElement.clientHeight;
          game_W = canvas.width;
          game_H = canvas.height;
          XXX = game_W / 2;
          YYY = game_H * 0.18;
          R = this.getWidth() * 2;
          if (!drag) r = R;
          MaxLeng = this.range(XXX, YYY, game_W - 2 * this.getWidth(), game_H - 2 * this.getWidth());
          if (N < 0) N = game_W * game_H / (20 * this.getWidth() * this.getWidth());
        }
      }
  
      draw() {
        if (this.context) {
          this.clearScreen();
          for (let i = 0; i < N; i++) {
            if (this.gg[i].alive) {
              this.gg[i].update();
              this.gg[i].draw();
            }
          }
  
          this.context.beginPath();
          this.context.strokeStyle = "#FF0000";
          this.context.lineWidth = Math.floor(this.getWidth() / 10);
          this.context.moveTo(XXX, YYY);
          this.context.lineTo(Xh, Yh);
  
          this.context.stroke();
          this.context.beginPath();
          this.context.arc(XXX, YYY, 3, 0, 2 * Math.PI);
          this.context.stroke();
  
          this.context.save();
          this.context.translate(Xh, Yh);
          this.context.rotate(this.toRadian(angle - 90));
          this.context.drawImage(loadedImages.hook, -this.getWidth() / 4, -this.getWidth() / 8, this.getWidth() / 2, this.getWidth() / 2);
          this.context.restore();
          this.drawText();
        } else {
          console.error("Context is not defined in draw method");
        }
      }
  
      drawText() {
        this.context.drawImage(loadedImages.dolarIM, this.getWidth() / 2, this.getWidth() / 2, this.getWidth(), this.getWidth());
        this.context.fillStyle = "red";
        if (this.score > tager)
            this.context.fillStyle = "#FF6600";
        this.context.font = this.getWidth() + 'px Stencil';
        this.context.fillText(this.score, this.getWidth() * 1.5, this.getWidth() * 1.35);
  
        this.context.drawImage(loadedImages.targetIM, this.getWidth() / 2, this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
        this.context.fillStyle = "#FF6600";
        this.context.font = this.getWidth() + 'px Stencil';
        this.context.fillText(tager, this.getWidth() * 1.5, this.getWidth() * 2.35);
  
        this.context.drawImage(loadedImages.levelIM, game_W - 3 * this.getWidth(), this.getWidth() / 2, this.getWidth(), this.getWidth());
        this.context.fillStyle = "#FFFFFF";
        this.context.font = this.getWidth() + 'px Stencil';
        this.context.fillText(level + 1, game_W - 2 * this.getWidth(), this.getWidth() * 1.35);
  
        this.context.drawImage(loadedImages.clockIM, game_W - 3 * this.getWidth(), this.getWidth() / 2 + this.getWidth(), this.getWidth(), this.getWidth());
        this.context.fillStyle = "#FFFFFF";
        this.context.font = this.getWidth() + 'px Stencil';
        this.context.fillText(Math.floor(time), game_W - 2 * this.getWidth(), this.getWidth() * 2.35);
  
        if (Math.abs(timeH - time) <= 0.7) {
            this.context.fillStyle = "red";
            this.context.fillText("+" + vlH, XXX, YYY * 0.8);
        }
      }
  
      clearScreen() {
        if (this.context) {
          this.context.clearRect(0, 0, game_W, game_H);
          if (loadedImages.bg) {
            this.context.drawImage(loadedImages.bg, (loadedImages.bg.width - game_W * (loadedImages.bg.height / game_H)) / 2, 0, game_W * (loadedImages.bg.height / game_H), loadedImages.bg.height, 0, 0, game_W, game_H);
          }
        } else {
          console.error("Context is not defined in clearScreen method");
        }
      }
  
      checkWin() {
        let check = true;
        for (let i = 0; i < N; i++) if (this.gg[i].alive == true) check = false;
        return check;
      }
  
      initGold() {
        this.gg = [];
        for (let i = 0; i < N; i++) this.gg[i] = new Gold(this);
        while (true) {
          let check = true;
          for (let i = 0; i < N - 1; i++)
            for (let j = i + 1; j < N; j++)
              while (this.range(this.gg[i].x, this.gg[i].y, this.gg[j].x, this.gg[j].y) < 2 * this.getWidth()) {
                check = false;
                this.gg[j].randomXY();
              }
          if (check) break;
        }
      }
  
      getWidth() {
        var area = document.documentElement.clientWidth * document.documentElement.clientHeight;
        return Math.sqrt(area / 300);
      }
  
      toRadian(angle) {
        return (angle / 180) * Math.PI;
      }
  
      range(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
      }
    }
  
    function handleButtonClick() {
      if (gameState === 'stop') {
        gameState = 'running';
      } else if (gameState === 'running') {
        gameState = 'paused';
      } else if (gameState === 'paused') {
        gameState = 'running';
      }
    }
  
    onMount(() => {
      loadImages(images, () => {
        console.log("Images loaded callback triggered");
        new Game();
      });
    });
  </script>
  
  <style>
    body {
      background-color: white;
      margin: 0px;
      text-align: center;
    }
  
    html,
    body {
      margin: 0;
      height: 100%;
      overflow: hidden;
    }
  
    html {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
  
    html {
      overflow-y: hidden;
    }
  
    #gameButton {
      position: relative;
      top: -50px;
      left: 235px;
      z-index: 10;
      padding: 20px 50px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 24px;
    }
  
    #gameButton:hover {
      background-color: #45a049;
    }
  </style>
  
  <div>
    <canvas></canvas>
    <button id="gameButton" on:click={handleButtonClick}>
      {gameState === 'stop' ? 'Start Game' : gameState === 'running' ? 'Stop' : 'Resume'}
    </button>
  </div>
  