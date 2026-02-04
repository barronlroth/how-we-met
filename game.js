/* global Phaser */
(() => {
  const WIDTH = 640;
  const HEIGHT = 360;
  const FLOOR_HEIGHT = 32;
  const GROUND_Y = HEIGHT - FLOOR_HEIGHT;
  const PLAYER_X = 160;

  const MOVE_SPEED = 140;
  const MEET_DISTANCE = 2000;

  const GRAVITY = 1200;
  const JUMP_VELOCITY = 420;

  const SNOWBALL_SPEED = 260;
  const SNOWBALL_ARC = 260;
  const SNOWBALL_GRAVITY = 800;
  const SNOWBALL_COOLDOWN_MS = 220;

  const RACCOON_SPEED = 90;
  const RACCOON_SPAWN_MS = 3200;

  const HAZE_COLOR = 0x3e6bc0;
  const HAZE_ALPHA = 0.28;
  const HAZE_MID_COLOR = 0x2c80e5;
  const HAZE_MID_ALPHA = 0.32;

  const MAX_HEALTH = 3;
  const INVINCIBLE_MS = 800;
  const SNOW_COUNT = 80;

  const ASSET_ROOT = "assets/";
  const asset = (name) => encodeURI(`${ASSET_ROOT}${name}`);
  const rootFile = (name) => encodeURI(`${name}`);

  class MeetingScene extends Phaser.Scene {
    preload() {
      const { width, height } = this.scale;
      const barWidth = 300;
      const barHeight = 10;
      const barX = (width - barWidth) / 2;
      const barY = height / 2;

      const progressBox = this.add.graphics();
      progressBox.fillStyle(0x1b2740, 0.9);
      progressBox.fillRoundedRect(barX - 8, barY - 8, barWidth + 16, barHeight + 16, 6);

      const progressBar = this.add.graphics();
      const loadingText = this.add
        .text(width / 2, barY - 26, "Loading Toronto...", {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#dbe6ff",
        })
        .setOrigin(0.5);

      this.load.on("progress", (value) => {
        progressBar.clear();
        progressBar.fillStyle(0x7aa2ff, 1);
        progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 4);
      });

      this.load.on("complete", () => {
        progressBar.destroy();
        progressBox.destroy();
        loadingText.destroy();
      });

      this.load.image("far", asset("far-bg.png"));
      this.load.image("mid", asset("mid-bg.png"));
      this.load.image("near", asset("bg-near.png"));
      this.load.spritesheet("barron", asset("barron-sprite-sheet.png"), {
        frameWidth: 64,
        frameHeight: 64,
      });
      this.load.spritesheet("nina", asset("nina-sprite-sheet.png"), {
        frameWidth: 64,
        frameHeight: 64,
      });
      this.load.spritesheet("raccoon", asset("raccoon-sprite-sheet.png"), {
        frameWidth: 64,
        frameHeight: 64,
      });
      this.load.spritesheet("snowball", asset("snowball-projectile.png"), {
        frameWidth: 36,
        frameHeight: 10,
      });
      this.load.audio(
        "bgm",
        [
          rootFile(
            "Passionfruit [8 Bit Tribute to Drake] - 8 Bit Universe-64k-stereo.mp3"
          ),
        ]
      );
    }

    create() {
      this.createFloorTexture();
      this.createSnowTexture();
      this.far = this.add.tileSprite(0, 0, WIDTH, HEIGHT, "far").setOrigin(0, 0).setDepth(0);
      this.hazeFar = this.add
        .rectangle(0, 0, WIDTH, HEIGHT, HAZE_COLOR, HAZE_ALPHA)
        .setOrigin(0, 0)
        .setDepth(1);
      this.hazeFar.setBlendMode(Phaser.BlendModes.SCREEN);

      this.horizon = this.add
        .tileSprite(0, 0, WIDTH, HEIGHT, "mid")
        .setOrigin(0, 0)
        .setDepth(2);

      this.hazeMid = this.add
        .rectangle(0, 0, WIDTH, HEIGHT, HAZE_MID_COLOR, HAZE_MID_ALPHA)
        .setOrigin(0, 0)
        .setDepth(3);
      this.hazeMid.setBlendMode(Phaser.BlendModes.DIFFERENCE);

      const nearHeight = HEIGHT;
      const nearY = HEIGHT - FLOOR_HEIGHT - nearHeight;
      this.near = this.add
        .tileSprite(0, nearY, WIDTH, nearHeight, "near")
        .setOrigin(0, 0)
        .setDepth(4);

      this.floor = this.add
        .tileSprite(0, HEIGHT - FLOOR_HEIGHT, WIDTH, FLOOR_HEIGHT, "floor")
        .setOrigin(0, 0)
        .setDepth(6);

      this.barron = this.add.sprite(PLAYER_X, GROUND_Y, "barron").setOrigin(0.5, 1);
      this.barron.setDepth(7);

      this.nina = this.add.sprite(WIDTH + 60, GROUND_Y, "nina").setOrigin(0.5, 1);
      this.nina.setVisible(false);
      this.nina.setDepth(7);

      this.anims.create({
        key: "barron-run",
        frames: this.anims.generateFrameNumbers("barron", { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: "barron-throw",
        frames: this.anims.generateFrameNumbers("barron", { start: 6, end: 10 }),
        frameRate: 10,
        repeat: 0,
      });
      this.anims.create({
        key: "nina-walk",
        frames: this.anims.generateFrameNumbers("nina", { start: 0, end: 11 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: "raccoon-run",
        frames: this.anims.generateFrameNumbers("raccoon", { start: 0, end: 5 }),
        frameRate: 10,
        repeat: -1,
      });
      // Snowball lifecycle: frame 0 = intact, frame 1 = streaking, frame 2 = splatter

      this.messageBox = this.createMessageBox();
      this.gameOverText = this.createGameOverText();

      this.createSnowField();

      this.musicStarted = false;
      this.music = this.sound.add("bgm", { loop: true, volume: 0.35 });
      this.startMusic = () => {
        if (this.musicStarted) return;
        this.musicStarted = true;
        this.music.play();
      };

      this.input.once("pointerdown", this.startMusic);
      this.input.keyboard.once("keydown", this.startMusic);

      this.pointerDown = false;
      this.distance = 0;
      this.met = false;

      this.barronVy = 0;
      this.barronGrounded = true;
      this.facing = 1;
      this.throwing = false;

      this.snowballs = [];
      this.lastSnowballAt = 0;

      this.raccoons = [];
      this.raccoonTimer = this.time.addEvent({
        delay: RACCOON_SPAWN_MS,
        loop: true,
        callback: this.spawnRaccoon,
        callbackScope: this,
      });

      this.health = MAX_HEALTH;
      this.invincibleUntil = 0;
      this.gameOver = false;
      this.healthText = this.add
        .text(16, 16, `Health: ${this.health}`, {
          fontFamily: "Arial, sans-serif",
          fontSize: "14px",
          color: "#e6eefc",
        })
        .setDepth(12);

      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        d: Phaser.Input.Keyboard.KeyCodes.D,
        space: Phaser.Input.Keyboard.KeyCodes.SPACE,
      });

      // Touch state
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
      this.touchThrow = false;

      // Detect touch device and create on-screen controls
      this.isTouchDevice = this.sys.game.device.input.touch;
      if (this.isTouchDevice) {
        this.input.addPointer(2); // support 3 simultaneous touches
        this.createTouchControls();
      } else {
        // Desktop: tap-to-walk fallback
        this.pointerDown = false;
        this.input.on("pointerdown", () => { this.pointerDown = true; });
        this.input.on("pointerup", () => { this.pointerDown = false; });
        this.input.on("pointerout", () => { this.pointerDown = false; });
        this.input.on("gameout", () => { this.pointerDown = false; });
      }
    }

    update(_time, delta) {
      const dt = delta / 1000;

      this.updateSnow(dt);

      const moveDir = this.getMoveDir();
      this.moveDir = moveDir;
      if (!this.gameOver && !this.met && moveDir !== 0) {
        const dx = MOVE_SPEED * dt * moveDir;
        this.scrollWorld(dx);
        if (moveDir > 0) {
          this.distance += dx;
        }

        if (!this.nina.visible && this.distance >= MEET_DISTANCE) {
          this.nina.setVisible(true);
        }

        if (this.nina.visible) {
          this.nina.x -= dx;
        }
      }

      if (this.nina.visible) {
        this.nina.setFlipX(true);
        this.nina.anims.play("nina-walk", true);
      }

      this.barron.setFlipX(this.facing < 0);
      if (!this.throwing && moveDir !== 0) {
        this.barron.anims.play("barron-run", true);
      } else if (!this.throwing && moveDir === 0) {
        this.barron.anims.stop();
        this.barron.setFrame(0);
      }

      // Jump: keyboard or touch (edge-detect touch)
      const touchJumpJust = this.touchJump && !this._prevTouchJump;
      this._prevTouchJump = this.touchJump;
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.w) ||
        touchJumpJust;

      if (!this.gameOver && jumpPressed && this.barronGrounded) {
        this.barronVy = -JUMP_VELOCITY;
        this.barronGrounded = false;
      }

      if (!this.barronGrounded) {
        this.barronVy += GRAVITY * dt;
        this.barron.y += this.barronVy * dt;
        if (this.barron.y >= GROUND_Y) {
          this.barron.y = GROUND_Y;
          this.barronVy = 0;
          this.barronGrounded = true;
        }
      }

      // Throw: keyboard or touch (edge-detect touch)
      const touchThrowJust = this.touchThrow && !this._prevTouchThrow;
      this._prevTouchThrow = this.touchThrow;
      const throwPressed = Phaser.Input.Keyboard.JustDown(this.keys.space) || touchThrowJust;
      if (!this.gameOver && throwPressed) {
        this.throwSnowball();
      }

      this.updateSnowballs(dt);
      this.updateRaccoons(dt);

      if (!this.met && this.nina.visible && this.checkMeet()) {
        this.triggerMeet();
      }
    }

    getMoveDir() {
      const moveRight =
        (this.cursors.right && this.cursors.right.isDown) || this.keys.d.isDown || this.pointerDown || this.touchRight;
      const moveLeft = (this.cursors.left && this.cursors.left.isDown) || this.keys.a.isDown || this.touchLeft;

      if (moveRight === moveLeft) {
        return 0;
      }

      const dir = moveRight ? 1 : -1;
      this.facing = dir;
      return dir;
    }

    scrollWorld(dx) {
      this.far.tilePositionX += dx * 0.1;
      this.horizon.tilePositionX += dx * 0.3;
      this.near.tilePositionX += dx * 0.6;
      this.floor.tilePositionX += dx;
    }

    updateSnow(dt) {
      for (const flake of this.snowflakes) {
        flake.sprite.y += flake.speed * dt;
        flake.sprite.x += flake.drift * dt;

        if (flake.sprite.y > HEIGHT + 4) {
          flake.sprite.y = -4;
          flake.sprite.x = Phaser.Math.Between(0, WIDTH);
        }

        if (flake.sprite.x < -4) {
          flake.sprite.x = WIDTH + 4;
        } else if (flake.sprite.x > WIDTH + 4) {
          flake.sprite.x = -4;
        }
      }
    }

    throwSnowball() {
      const now = this.time.now;
      if (now - this.lastSnowballAt < SNOWBALL_COOLDOWN_MS) return;
      this.lastSnowballAt = now;

      this.throwing = true;
      this.barron.anims.play("barron-throw", true);
      this.barron.once("animationcomplete-barron-throw", () => {
        this.throwing = false;
        if (this.getMoveDir() !== 0) {
          this.barron.anims.play("barron-run", true);
        } else {
          this.barron.anims.stop();
          this.barron.setFrame(0);
        }
      });

      const spawnX = this.barron.x + this.facing * 12;
      const spawnY = this.barron.y - 26;
      const sprite = this.add.sprite(spawnX, spawnY, "snowball").setDepth(8);
      sprite.setFrame(0);
      sprite.setFlipX(this.facing < 0);
      // Transition to streaking frame after brief launch
      this.time.delayedCall(80, () => {
        if (sprite.active) sprite.setFrame(1);
      });
      this.snowballs.push({
        sprite,
        vx: this.facing * SNOWBALL_SPEED,
        vy: -SNOWBALL_ARC,
      });
    }

    updateSnowballs(dt) {
      for (let i = this.snowballs.length - 1; i >= 0; i -= 1) {
        const snowball = this.snowballs[i];
        snowball.vy += SNOWBALL_GRAVITY * dt;
        snowball.sprite.x += snowball.vx * dt;
        snowball.sprite.y += snowball.vy * dt;

        if (
          snowball.sprite.x < -20 ||
          snowball.sprite.x > WIDTH + 20 ||
          snowball.sprite.y > HEIGHT + 20
        ) {
          snowball.sprite.destroy();
          this.snowballs.splice(i, 1);
          continue;
        }

        for (let j = this.raccoons.length - 1; j >= 0; j -= 1) {
          const raccoon = this.raccoons[j];
          if (!raccoon.alive) continue;
          if (Phaser.Geom.Intersects.RectangleToRectangle(snowball.sprite.getBounds(), this.raccoonBounds(raccoon.sprite))) {
            // Show splatter frame, then destroy
            snowball.sprite.setFrame(2);
            snowball.sprite.body && (snowball.sprite.body.enable = false);
            const splatSprite = snowball.sprite;
            this.snowballs.splice(i, 1);
            this.time.delayedCall(120, () => splatSprite.destroy());
            this.killRaccoon(j);
            break;
          }
        }
      }
    }

    spawnRaccoon() {
      if (this.gameOver) return;
      const sprite = this.add.sprite(WIDTH + 40, GROUND_Y, "raccoon").setOrigin(0.5, 1);
      sprite.setDepth(6);
      sprite.setFlipX(true);
      sprite.anims.play("raccoon-run", true);
      this.raccoons.push({ sprite, alive: true });
    }

    updateRaccoons(dt) {
      const playerBounds = this.barron.getBounds();

      for (let i = this.raccoons.length - 1; i >= 0; i -= 1) {
        const raccoon = this.raccoons[i];
        raccoon.sprite.anims.play("raccoon-run", true);
        raccoon.sprite.x -= RACCOON_SPEED * dt;

        if (raccoon.sprite.x < -60) {
          raccoon.sprite.destroy();
          this.raccoons.splice(i, 1);
          continue;
        }

        if (!raccoon.alive) continue;

        const rBounds = this.raccoonBounds(raccoon.sprite);
        if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, rBounds)) {
          const stompHit = this.barronVy > 0 && playerBounds.bottom <= rBounds.top + 8;
          if (stompHit) {
            this.killRaccoon(i);
            this.barronVy = -JUMP_VELOCITY * 0.6;
            this.barronGrounded = false;
          } else {
            this.damagePlayer();
          }
        }
      }
    }

    killRaccoon(index) {
      const raccoon = this.raccoons[index];
      if (!raccoon) return;
      raccoon.alive = false;
      raccoon.sprite.destroy();
      this.raccoons.splice(index, 1);
    }

    damagePlayer() {
      if (this.time.now < this.invincibleUntil || this.gameOver) return;
      this.health = Math.max(0, this.health - 1);
      this.healthText.setText(`Health: ${this.health}`);
      this.invincibleUntil = this.time.now + INVINCIBLE_MS;
      this.barron.setAlpha(0.6);
      this.time.delayedCall(INVINCIBLE_MS, () => {
        this.barron.setAlpha(1);
      });

      if (this.health <= 0) {
        this.gameOver = true;
        this.gameOverText.setVisible(true);
      }
    }

    overlaps(a, b) {
      return Phaser.Geom.Intersects.RectangleToRectangle(a.getBounds(), b.getBounds());
    }

    // Tighter hitbox for raccoon sprites (art is ~30x20 inside 64x64 frame)
    raccoonBounds(sprite) {
      const full = sprite.getBounds();
      const insetX = 17;
      const insetTop = 22;
      const insetBottom = 22;
      return new Phaser.Geom.Rectangle(
        full.x + insetX,
        full.y + insetTop,
        full.width - insetX * 2,
        full.height - insetTop - insetBottom
      );
    }

    checkMeet() {
      const barronBounds = this.barron.getBounds();
      const ninaBounds = this.nina.getBounds();
      return Phaser.Geom.Intersects.RectangleToRectangle(barronBounds, ninaBounds);
    }

    triggerMeet() {
      this.met = true;
      this.messageBox.setVisible(true);
    }

    createTouchControls() {
      const btnSize = 48;
      const pad = 12;
      const y = HEIGHT - btnSize - pad;
      const alpha = 0.3;
      const activeAlpha = 0.6;
      const depth = 20;

      const makeBtn = (x, yPos, label) => {
        const bg = this.add.graphics();
        bg.fillStyle(0xffffff, alpha);
        bg.fillRoundedRect(0, 0, btnSize, btnSize, 10);
        const txt = this.add.text(btnSize / 2, btnSize / 2, label, {
          fontFamily: "Arial, sans-serif",
          fontSize: "20px",
          color: "#ffffff",
        }).setOrigin(0.5);
        const container = this.add.container(x, yPos, [bg, txt]).setDepth(depth);
        container.setSize(btnSize, btnSize);
        container.setInteractive();
        container._bg = bg;
        container._alpha = alpha;
        container._activeAlpha = activeAlpha;
        return container;
      };

      // Left side: ◀ ▶
      const leftBtn = makeBtn(pad, y, "◀");
      const rightBtn = makeBtn(pad + btnSize + pad, y, "▶");

      // Right side: Jump + Throw
      const throwBtn = makeBtn(WIDTH - pad - btnSize, y, "❄");
      const jumpBtn = makeBtn(WIDTH - pad * 2 - btnSize * 2, y, "▲");

      const bindBtn = (btn, prop) => {
        btn.on("pointerdown", () => {
          this[prop] = true;
          btn._bg.clear();
          btn._bg.fillStyle(0xffffff, btn._activeAlpha);
          btn._bg.fillRoundedRect(0, 0, btnSize, btnSize, 10);
        });
        btn.on("pointerup", () => {
          this[prop] = false;
          btn._bg.clear();
          btn._bg.fillStyle(0xffffff, btn._alpha);
          btn._bg.fillRoundedRect(0, 0, btnSize, btnSize, 10);
        });
        btn.on("pointerout", () => {
          this[prop] = false;
          btn._bg.clear();
          btn._bg.fillStyle(0xffffff, btn._alpha);
          btn._bg.fillRoundedRect(0, 0, btnSize, btnSize, 10);
        });
      };

      bindBtn(leftBtn, "touchLeft");
      bindBtn(rightBtn, "touchRight");
      bindBtn(jumpBtn, "touchJump");
      bindBtn(throwBtn, "touchThrow");

      // Fullscreen button (top-right)
      const fsBg = this.add.graphics();
      fsBg.fillStyle(0x000000, 0.5);
      fsBg.fillRoundedRect(0, 0, 80, 28, 8);
      const fsTxt = this.add.text(40, 14, "⛶ PLAY", {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "bold",
      }).setOrigin(0.5);
      const fsBtn = this.add.container(WIDTH - 88, 8, [fsBg, fsTxt]).setDepth(depth);
      fsBtn.setSize(80, 28);
      fsBtn.setInteractive();
      fsBtn.on("pointerdown", () => {
        this.scale.startFullscreen();
      });

      // Track jump/throw edge detection for touch
      this._prevTouchJump = false;
      this._prevTouchThrow = false;
    }

    createFloorTexture() {
      const g = this.add.graphics();
      const tileWidth = 32;
      const tileHeight = FLOOR_HEIGHT;

      g.fillStyle(0x2b2b2b, 1);
      g.fillRect(0, 0, tileWidth, tileHeight);
      g.fillStyle(0x3a3a3a, 1);
      g.fillRect(0, tileHeight - 8, tileWidth, 4);
      g.fillStyle(0x4a4a4a, 1);
      g.fillRect(0, tileHeight - 4, tileWidth, 2);
      g.fillStyle(0x1f1f1f, 1);
      g.fillRect(6, 6, 20, 2);
      g.fillRect(4, 16, 24, 2);

      g.generateTexture("floor", tileWidth, tileHeight);
      g.destroy();
    }

    createSnowTexture() {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture("snow", 2, 2);
      g.destroy();
    }


    createSnowField() {
      this.snowflakes = [];
      for (let i = 0; i < SNOW_COUNT; i += 1) {
        const sprite = this.add
          .image(Phaser.Math.Between(0, WIDTH), Phaser.Math.Between(0, HEIGHT), "snow")
          .setDepth(9);
        this.snowflakes.push({
          sprite,
          speed: Phaser.Math.Between(20, 60),
          drift: Phaser.Math.Between(-12, 12),
        });
      }
    }

    createMessageBox() {
      const boxWidth = 360;
      const boxHeight = 90;
      const x = (WIDTH - boxWidth) / 2;
      const y = 30;

      const bg = this.add.graphics();
      bg.fillStyle(0x0f1626, 0.92);
      bg.fillRoundedRect(x, y, boxWidth, boxHeight, 12);
      bg.lineStyle(2, 0x5f7db8, 0.8);
      bg.strokeRoundedRect(x, y, boxWidth, boxHeight, 12);

      const text = this.add
        .text(WIDTH / 2, y + boxHeight / 2, "Hearts in Toronto.\nSave the Date!", {
          fontFamily: "Arial, sans-serif",
          fontSize: "16px",
          color: "#e6eefc",
          align: "center",
        })
        .setOrigin(0.5);

      const container = this.add.container(0, 0, [bg, text]);
      container.setDepth(10);
      container.setVisible(false);
      return container;
    }

    createGameOverText() {
      return this.add
        .text(WIDTH / 2, HEIGHT / 2, "Raccoon got you!", {
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
          color: "#ffe6e6",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(12)
        .setVisible(false);
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: WIDTH,
    height: HEIGHT,
    parent: "game",
    backgroundColor: "#0b0f1a",
    pixelArt: true,
    roundPixels: true,
    fps: { target: 60 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      fullscreenTarget: "game",
    },
    input: {
      activePointers: 3,
    },
    scene: [MeetingScene],
  };

  new Phaser.Game(config);
})();
