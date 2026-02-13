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

  const DIALOGUE_LINES = [
    {
      speaker: "Barron",
      text: "Snowy streets, big city... and there you are.",
    },
    {
      speaker: "Nina",
      text: "Toronto always makes an entrance. So do you.",
    },
    {
      speaker: "Barron",
      text: "Good thing we met here. I was ready to call it a day.",
    },
    {
      speaker: "Nina",
      text: "Next level: Florida. Sunlight, palm trees, and a brand-new chapter.",
    },
  ];

  class TitleScene extends Phaser.Scene {
    constructor() {
      super({ key: "TitleScene" });
    }

    preload() {
      this.load.image("far", asset("far-bg.png"));
    }

    create() {
      // Background
      this.add.tileSprite(0, 0, WIDTH, HEIGHT, "far").setOrigin(0, 0);
      this.add
        .rectangle(0, 0, WIDTH, HEIGHT, 0x0b0f1a, 0.55)
        .setOrigin(0, 0);

      // Title
      this.add
        .text(WIDTH / 2, HEIGHT * 0.32, "How We Met", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "28px",
          color: "#e6eefc",
          stroke: "#1a2744",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      // Subtitle
      this.add
        .text(WIDTH / 2, HEIGHT * 0.48, "A Barron & Nina Story", {
          fontFamily: '"VT323", monospace',
          fontSize: "18px",
          color: "#8ab4f8",
        })
        .setOrigin(0.5);

      // Blinking "Tap to Start" text
      const startText = this.add
        .text(WIDTH / 2, HEIGHT * 0.72, "Tap to Start", {
          fontFamily: '"Press Start 2P", monospace',
          fontSize: "14px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: startText,
        alpha: 0.2,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // Entire screen is the tap target
      this.input.on("pointerdown", () => {
        this.scene.start("MeetingScene");
      });

      // Also support Enter / Space on desktop
      this.input.keyboard.on("keydown-ENTER", () => {
        this.scene.start("MeetingScene");
      });
      this.input.keyboard.on("keydown-SPACE", () => {
        this.scene.start("MeetingScene");
      });
    }
  }

  class MeetingScene extends Phaser.Scene {
    constructor() {
      super({ key: "MeetingScene" });
    }

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
        frameWidth: 256,
        frameHeight: 256,
      });
      this.load.image("barron-portrait", asset("portraits/barron-portrait-1.png"));
      this.load.image("nina-portrait", asset("portraits/nina-portrait-1.png"));
      this.load.image("barron-portrait-2", asset("portraits/barron-portrait-2.jpg"));
      this.load.image("nina-portrait-2", asset("portraits/nina-portrait-2.jpg"));
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
      // Snowball lifecycle (5 frames @ 256×256):
      // frame 0 = intact, frame 1 = streaking, frame 2 = impact, frame 3 = splatter, frame 4 = dissipate

      this.gameOverText = this.createGameOverText();
      this.dialogueContainer = this.createDialogueUI();
      this.transitionCard = this.createTransitionCard();
      this.dialogueLines = DIALOGUE_LINES;
      this.dialogueIndex = 0;
      this.dialogueActive = false;
      this.transitionActive = false;
      this.dialogueAdvanceAt = 0;
      this.restartButton = this.createRestartButton();

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
        enter: Phaser.Input.Keyboard.KeyCodes.ENTER,
      });
      this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
      this.touchThrow = false;
      if (this.isTouchDevice) {
        this.createTouchControls();
      }

      this.input.on("pointerdown", () => {
        if (this.dialogueActive || this.transitionActive) {
          this.advanceDialogue();
          return;
        }
        if (!this.isTouchDevice) {
          this.pointerDown = true;
        }
      });
      this.input.on("pointerup", () => {
        this.pointerDown = false;
      });
      this.input.on("pointerout", () => {
        this.pointerDown = false;
      });
      this.input.on("gameout", () => {
        this.pointerDown = false;
      });
    }

    update(_time, delta) {
      const dt = delta / 1000;

      this.updateSnow(dt, this.lastScrollDx || 0);
      this.lastScrollDx = 0;

      if (this.dialogueActive || this.transitionActive) {
        this.updateDialogueInput();
        return;
      }

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

      const touchJumpPressed = this.touchJump;
      this.touchJump = false;
      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.w) ||
        touchJumpPressed;

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

      const touchThrowPressed = this.touchThrow;
      this.touchThrow = false;
      const throwPressed = Phaser.Input.Keyboard.JustDown(this.keys.space) || touchThrowPressed;
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
        (this.cursors.right && this.cursors.right.isDown) ||
        this.keys.d.isDown ||
        this.pointerDown ||
        this.touchRight;
      const moveLeft =
        (this.cursors.left && this.cursors.left.isDown) || this.keys.a.isDown || this.touchLeft;

      if (moveRight === moveLeft) {
        return 0;
      }

      const dir = moveRight ? 1 : -1;
      this.facing = dir;
      return dir;
    }

    createTouchControls() {
      this.input.addPointer(2);

      const baseAlpha = 0.25;
      const activeAlpha = 0.5;
      const radius = 28;
      const white = 0xffffff;

      const drawArrowLeft = (g, x, y) => {
        g.beginPath();
        g.moveTo(x + 9, y - 10);
        g.lineTo(x - 9, y);
        g.lineTo(x + 9, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x + 11, y);
        g.lineTo(x - 9, y);
        g.strokePath();
      };

      const drawArrowRight = (g, x, y) => {
        g.beginPath();
        g.moveTo(x - 9, y - 10);
        g.lineTo(x + 9, y);
        g.lineTo(x - 9, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x - 11, y);
        g.lineTo(x + 9, y);
        g.strokePath();
      };

      const drawArrowUp = (g, x, y) => {
        g.beginPath();
        g.moveTo(x - 10, y + 9);
        g.lineTo(x, y - 9);
        g.lineTo(x + 10, y + 9);
        g.strokePath();
        g.beginPath();
        g.moveTo(x, y + 11);
        g.lineTo(x, y - 9);
        g.strokePath();
      };

      const drawSnowflake = (g, x, y) => {
        g.beginPath();
        g.moveTo(x - 10, y);
        g.lineTo(x + 10, y);
        g.strokePath();
        g.beginPath();
        g.moveTo(x, y - 10);
        g.lineTo(x, y + 10);
        g.strokePath();
        g.beginPath();
        g.moveTo(x - 7, y - 7);
        g.lineTo(x + 7, y + 7);
        g.strokePath();
        g.beginPath();
        g.moveTo(x + 7, y - 7);
        g.lineTo(x - 7, y + 7);
        g.strokePath();
      };

      const createButton = ({ x, y, drawIcon, onPress, onRelease }) => {
        const button = this.add.graphics();
        button.fillStyle(white, 1);
        button.fillCircle(x, y, radius);
        button.lineStyle(2, white, 0.45);
        button.strokeCircle(x, y, radius);
        button.lineStyle(3, white, 0.95);
        drawIcon(button, x, y);
        button.setScrollFactor(0);
        button.setDepth(1000);
        button.setAlpha(baseAlpha);
        button.setInteractive({
          hitArea: new Phaser.Geom.Circle(x, y, radius),
          hitAreaCallback: Phaser.Geom.Circle.Contains,
        });

        button.on("pointerdown", () => {
          onPress();
          button.setAlpha(activeAlpha);
        });

        const release = () => {
          onRelease();
          button.setAlpha(baseAlpha);
        };

        button.on("pointerup", release);
        button.on("pointerout", release);
        return button;
      };

      this.touchButtons = {
        left: createButton({
          x: 50,
          y: HEIGHT - 50,
          drawIcon: drawArrowLeft,
          onPress: () => {
            this.touchLeft = true;
          },
          onRelease: () => {
            this.touchLeft = false;
          },
        }),
        right: createButton({
          x: 120,
          y: HEIGHT - 50,
          drawIcon: drawArrowRight,
          onPress: () => {
            this.touchRight = true;
          },
          onRelease: () => {
            this.touchRight = false;
          },
        }),
        jump: createButton({
          x: WIDTH - 120,
          y: HEIGHT - 50,
          drawIcon: drawArrowUp,
          onPress: () => {
            this.touchJump = true;
          },
          onRelease: () => {
            this.touchJump = false;
          },
        }),
        throw: createButton({
          x: WIDTH - 50,
          y: HEIGHT - 50,
          drawIcon: drawSnowflake,
          onPress: () => {
            this.touchThrow = true;
          },
          onRelease: () => {
            this.touchThrow = false;
          },
        }),
      };
    }

    scrollWorld(dx) {
      this.far.tilePositionX += dx * 0.1;
      this.horizon.tilePositionX += dx * 0.3;
      this.near.tilePositionX += dx * 0.6;
      this.floor.tilePositionX += dx;
      this.lastScrollDx = dx;

      // Keep raccoons anchored to the game world when scrolling
      for (const raccoon of this.raccoons) {
        raccoon.sprite.x -= dx;
      }
    }

    updateSnow(dt, dx) {
      for (const flake of this.snowflakes) {
        flake.sprite.y += flake.speed * dt;
        flake.sprite.x += flake.drift * dt;

        // Parallax: snow drifts opposite to camera based on its fall speed
        // Slower flakes = further away = less parallax, faster = closer = more
        if (dx) {
          const parallaxFactor = 0.3 + (flake.speed / 60) * 0.5; // 0.3–0.8 range
          flake.sprite.x -= dx * parallaxFactor;
        }

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
      sprite.setScale(0.35);
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

        // Off-screen left/right — just remove
        if (
          snowball.sprite.x < -20 ||
          snowball.sprite.x > WIDTH + 20
        ) {
          snowball.sprite.destroy();
          this.snowballs.splice(i, 1);
          continue;
        }

        // Hit the ground — play splatter and destroy
        if (snowball.sprite.y >= GROUND_Y) {
          snowball.sprite.y = GROUND_Y;
          snowball.sprite.setFrame(2);
          const splatSprite = snowball.sprite;
          this.snowballs.splice(i, 1);
          this.time.delayedCall(80, () => {
            if (splatSprite.active) splatSprite.setFrame(3);
            this.time.delayedCall(80, () => {
              if (splatSprite.active) splatSprite.setFrame(4);
              this.time.delayedCall(80, () => splatSprite.destroy());
            });
          });
          continue;
        }

        for (let j = this.raccoons.length - 1; j >= 0; j -= 1) {
          const raccoon = this.raccoons[j];
          if (!raccoon.alive) continue;
          if (Phaser.Geom.Intersects.RectangleToRectangle(snowball.sprite.getBounds(), this.raccoonBounds(raccoon.sprite))) {
            // Show splatter sequence: impact → splatter → dissipate → destroy
            snowball.sprite.setFrame(2);
            snowball.sprite.body && (snowball.sprite.body.enable = false);
            const splatSprite = snowball.sprite;
            this.snowballs.splice(i, 1);
            this.time.delayedCall(80, () => {
              if (splatSprite.active) splatSprite.setFrame(3);
              this.time.delayedCall(80, () => {
                if (splatSprite.active) splatSprite.setFrame(4);
                this.time.delayedCall(80, () => splatSprite.destroy());
              });
            });
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
      this.raccoons.splice(index, 1);

      const sprite = raccoon.sprite;
      sprite.anims.stop();

      // Blood spatter particles
      for (let i = 0; i < 8; i += 1) {
        const bx = sprite.x + Phaser.Math.Between(-10, 10);
        const by = sprite.y + Phaser.Math.Between(-8, 4);
        const blood = this.add.circle(bx, by, Phaser.Math.Between(2, 5), 0xcc1111, 1).setDepth(7);
        this.tweens.add({
          targets: blood,
          x: bx + Phaser.Math.Between(-30, 30),
          y: by + Phaser.Math.Between(-40, -5),
          alpha: 0,
          scaleX: 0.3,
          scaleY: 0.3,
          duration: Phaser.Math.Between(300, 600),
          ease: "Power2",
          onComplete: () => blood.destroy(),
        });
      }

      // Flip upside-down and fall through ground
      sprite.setFlipY(true);
      this.tweens.add({
        targets: sprite,
        y: sprite.y + 120,
        angle: Phaser.Math.Between(-45, 45),
        alpha: 0,
        duration: 800,
        ease: "Power1",
        onComplete: () => sprite.destroy(),
      });
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
        this.restartButton.setVisible(true);
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
      this.startDialogue();
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

    createDialogueUI() {
      const container = this.add.container(0, 0);
      container.setDepth(20);
      container.setVisible(false);

      const overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x05070f, 0.58).setOrigin(0, 0);
      container.add(overlay);

      const portraitSize = 180;
      const frameSize = 196;
      const portraitOffset = 8;
      const leftPortraitX = -portraitOffset;
      const rightPortraitX = WIDTH + portraitOffset;
      const leftPortraitRight = leftPortraitX + frameSize;
      const rightPortraitLeft = rightPortraitX - frameSize;
      const gapWidth = rightPortraitLeft - leftPortraitRight;

      const boxW = Math.min(WIDTH - 48, gapWidth - 16);
      const boxH = 120;
      const boxX = (WIDTH - boxW) / 2;
      const boxY = (HEIGHT - boxH) / 2;
      const textX = boxX + 18;
      const textWidth = boxW - 36;
      const textMaxX = boxX + boxW - 18;

      const box = this.add.graphics();
      box.fillGradientStyle(0x0d1a33, 0x0d1a33, 0x152a54, 0x152a54, 1);
      box.fillRoundedRect(boxX, boxY, boxW, boxH, 12);
      box.lineStyle(2, 0x7bc3ff, 0.95);
      box.strokeRoundedRect(boxX, boxY, boxW, boxH, 12);
      box.lineStyle(1, 0x213868, 1);
      box.strokeRoundedRect(boxX + 4, boxY + 4, boxW - 8, boxH - 8, 10);
      container.add(box);

      const namePlateW = Math.min(148, textWidth);
      const namePlateH = 22;
      const namePlateX = textX;
      const namePlateY = boxY - 14;

      const namePlate = this.add.graphics();
      namePlate.fillStyle(0x122447, 0.98);
      namePlate.fillRoundedRect(namePlateX, namePlateY, namePlateW, namePlateH, 8);
      namePlate.lineStyle(1, 0x7bc3ff, 0.9);
      namePlate.strokeRoundedRect(namePlateX, namePlateY, namePlateW, namePlateH, 8);
      container.add(namePlate);

      this.dialogueName = this.add.text(namePlateX + 10, namePlateY + 5, "", {
        fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
        fontSize: "10px",
        color: "#ffe9a8",
      });

      this.dialogueText = this.add.text(textX, boxY + 18, "", {
        fontFamily: "\"VT323\", \"Press Start 2P\", monospace",
        fontSize: "20px",
        color: "#e6f1ff",
        wordWrap: { width: textWidth },
        lineSpacing: 6,
      });

      this.dialogueHint = this.add
        .text(textMaxX, boxY + boxH - 12, "click / space", {
          fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
          fontSize: "8px",
          color: "#9fc3ff",
        })
        .setOrigin(1, 1);

      container.add([this.dialogueName, this.dialogueText, this.dialogueHint]);

      this.tweens.add({
        targets: this.dialogueHint,
        alpha: 0.2,
        duration: 650,
        yoyo: true,
        repeat: -1,
      });

      this.barronPortrait = this.createPortraitPanel({
        key: "barron-portrait-2",
        label: "B",
        x: leftPortraitX,
        y: HEIGHT - 18,
        anchorX: 0,
        anchorY: 1,
        frameSize,
        portraitSize,
      });

      this.ninaPortrait = this.createPortraitPanel({
        key: "nina-portrait-2",
        label: "N",
        x: rightPortraitX,
        y: 18,
        anchorX: 1,
        anchorY: 0,
        frameSize,
        portraitSize,
      });

      container.add(this.barronPortrait.container);
      container.add(this.ninaPortrait.container);

      return container;
    }

    createPortraitPanel({ key, label, x, y, anchorX, anchorY, frameSize, portraitSize }) {
      const container = this.add.container(0, 0);
      const panel = this.add.graphics();
      panel.fillGradientStyle(0x111f3a, 0x111f3a, 0x1a2f57, 0x1a2f57, 1);
      panel.fillRoundedRect(0, 0, frameSize, frameSize, 14);
      panel.lineStyle(2, 0x7bc3ff, 0.9);
      panel.strokeRoundedRect(0, 0, frameSize, frameSize, 14);
      panel.lineStyle(1, 0x223a6b, 1);
      panel.strokeRoundedRect(4, 4, frameSize - 8, frameSize - 8, 12);

      let image = null;
      let initials = null;
      if (this.textures.exists(key)) {
        image = this.add.image(frameSize / 2, frameSize / 2, key);
        image.setDisplaySize(portraitSize, portraitSize);
      } else {
        image = this.add.rectangle(
          frameSize / 2,
          frameSize / 2,
          portraitSize,
          portraitSize,
          0x162749,
          1
        );
        initials = this.add
          .text(frameSize / 2, frameSize / 2, label, {
            fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
            fontSize: "16px",
            color: "#cfe2ff",
          })
          .setOrigin(0.5);
      }

      const shine = this.add.graphics();
      shine.fillStyle(0xffffff, 0.08);
      shine.fillRoundedRect(6, 6, frameSize - 12, frameSize / 2 - 6, 12);

      container.add([panel, image, shine]);
      if (initials) container.add(initials);

      const posX = anchorX === 1 ? x - frameSize : x;
      const posY = anchorY === 1 ? y - frameSize : y;
      container.setPosition(posX, posY);

      return { container, image };
    }

    createTransitionCard() {
      const container = this.add.container(0, 0);
      container.setDepth(22);
      container.setVisible(false);

      const overlay = this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x04060d, 0.7).setOrigin(0, 0);

      const cardW = 360;
      const cardH = 120;
      const cardX = (WIDTH - cardW) / 2;
      const cardY = (HEIGHT - cardH) / 2;

      const card = this.add.graphics();
      card.fillGradientStyle(0x0f223b, 0x0f223b, 0x1c4f5c, 0x1c4f5c, 1);
      card.fillRoundedRect(cardX, cardY, cardW, cardH, 14);
      card.lineStyle(2, 0x7bc3ff, 0.95);
      card.strokeRoundedRect(cardX, cardY, cardW, cardH, 14);
      card.lineStyle(1, 0x2a5d72, 1);
      card.strokeRoundedRect(cardX + 4, cardY + 4, cardW - 8, cardH - 8, 12);

      const title = this.add
        .text(WIDTH / 2, cardY + 26, "NEXT LEVEL", {
          fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
          fontSize: "10px",
          color: "#ffe9a8",
        })
        .setOrigin(0.5);

      const subtitle = this.add
        .text(WIDTH / 2, cardY + 64, "Florida", {
          fontFamily: "\"VT323\", \"Press Start 2P\", monospace",
          fontSize: "34px",
          color: "#e6f1ff",
        })
        .setOrigin(0.5);

      const hint = this.add
        .text(WIDTH / 2, cardY + cardH - 14, "click to replay", {
          fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
          fontSize: "8px",
          color: "#9fc3ff",
        })
        .setOrigin(0.5, 1);

      this.tweens.add({
        targets: hint,
        alpha: 0.2,
        duration: 650,
        yoyo: true,
        repeat: -1,
      });

      container.add([overlay, card, title, subtitle, hint]);
      return container;
    }

    startDialogue() {
      this.dialogueActive = true;
      this.transitionActive = false;
      if (this.transitionCard) this.transitionCard.setVisible(false);
      this.pointerDown = false;
      this.dialogueIndex = 0;
      this.dialogueContainer.setVisible(true);
      if (this.raccoonTimer) this.raccoonTimer.paused = true;
      this.setDialogueLine(this.dialogueIndex);
    }

    updateDialogueInput() {
      const advancePressed =
        Phaser.Input.Keyboard.JustDown(this.keys.space) ||
        Phaser.Input.Keyboard.JustDown(this.keys.enter);
      if (advancePressed) {
        this.advanceDialogue();
      }
    }

    setDialogueLine(index) {
      const line = this.dialogueLines[index];
      if (!line) return;

      this.dialogueName.setText(line.speaker);
      this.dialogueFullText = line.text;
      this.dialogueText.setText("");
      this.dialogueHint.setVisible(false);

      const isBarron = line.speaker === "Barron";
      this.setPortraitActive(this.barronPortrait, isBarron);
      this.setPortraitActive(this.ninaPortrait, !isBarron);

      if (this.dialogueTypingTimer) {
        this.dialogueTypingTimer.remove();
      }

      this.dialogueTypingIndex = 0;
      this.dialogueTypingTimer = this.time.addEvent({
        delay: 18,
        loop: true,
        callback: () => {
          this.dialogueTypingIndex += 1;
          this.dialogueText.setText(this.dialogueFullText.slice(0, this.dialogueTypingIndex));
          if (this.dialogueTypingIndex >= this.dialogueFullText.length) {
            this.dialogueTypingTimer.remove();
            this.dialogueTypingTimer = null;
            this.dialogueHint.setVisible(true);
          }
        },
      });
    }

    setPortraitActive(portrait, active) {
      if (!portrait) return;
      portrait.container.setAlpha(active ? 1 : 0.45);
      portrait.container.setScale(active ? 1 : 0.97);
    }

    advanceDialogue() {
      if (this.time.now < this.dialogueAdvanceAt) return;
      this.dialogueAdvanceAt = this.time.now + 140;

      if (this.transitionActive) {
        this.restartGame();
        return;
      }

      if (this.dialogueTypingTimer) {
        this.dialogueTypingTimer.remove();
        this.dialogueTypingTimer = null;
        this.dialogueText.setText(this.dialogueFullText);
        this.dialogueHint.setVisible(true);
        return;
      }

      if (!this.dialogueActive) return;

      this.dialogueIndex += 1;
      if (this.dialogueIndex >= this.dialogueLines.length) {
        this.finishDialogue();
        return;
      }
      this.setDialogueLine(this.dialogueIndex);
    }

    finishDialogue() {
      this.dialogueActive = false;
      this.dialogueContainer.setVisible(false);
      this.transitionActive = true;
      this.transitionCard.setVisible(true);
    }

    createGameOverText() {
      return this.add
        .text(WIDTH / 2, HEIGHT / 2, "Raccoon got you!", {
          fontFamily: "\"Press Start 2P\", \"VT323\", monospace",
          fontSize: "16px",
          color: "#ffe6e6",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(12)
        .setVisible(false);
    }

    createRestartButton() {
      const buttonWidth = 140;
      const buttonHeight = 36;
      const x = (WIDTH - buttonWidth) / 2;
      const y = HEIGHT / 2 + 28;

      const bg = this.add.graphics();
      bg.fillStyle(0x24324f, 0.95);
      bg.fillRoundedRect(0, 0, buttonWidth, buttonHeight, 10);
      bg.lineStyle(2, 0x5f7db8, 0.9);
      bg.strokeRoundedRect(0, 0, buttonWidth, buttonHeight, 10);

      const text = this.add
        .text(buttonWidth / 2, buttonHeight / 2, "Restart", {
          fontFamily: "\"VT323\", \"Press Start 2P\", monospace",
          fontSize: "18px",
          color: "#e6eefc",
        })
        .setOrigin(0.5);

      const container = this.add.container(0, 0, [bg, text]);
      container.setPosition(x, y);
      container.setDepth(12);
      container.setSize(buttonWidth, buttonHeight);
      container.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, buttonWidth, buttonHeight),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      container.on("pointerdown", () => {
        this.restartGame();
      });
      container.setVisible(false);
      return container;
    }

    restartGame() {
      this.gameOver = true;
      if (this.music && this.music.isPlaying) {
        this.music.stop();
      }
      this.scene.restart();
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
    },
    scene: [TitleScene, MeetingScene],
  };

  new Phaser.Game(config);
})();
