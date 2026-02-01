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
      this.load.image("barron", asset("barron-v1.png"));
      this.load.image("nina", asset("nina.png"));
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
      this.createSnowballTexture();
      this.createRaccoonTexture();

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

      this.input.on("pointerdown", () => {
        this.pointerDown = true;
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

      this.updateSnow(dt);

      const moveDir = this.getMoveDir();
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

      const jumpPressed =
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.keys.w);

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

      const throwPressed = Phaser.Input.Keyboard.JustDown(this.keys.space);
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
        (this.cursors.right && this.cursors.right.isDown) || this.keys.d.isDown || this.pointerDown;
      const moveLeft = (this.cursors.left && this.cursors.left.isDown) || this.keys.a.isDown;

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

      const spawnX = this.barron.x + this.facing * 12;
      const spawnY = this.barron.y - 26;
      const sprite = this.add.sprite(spawnX, spawnY, "snowball").setDepth(8);
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
          if (this.overlaps(snowball.sprite, raccoon.sprite)) {
            snowball.sprite.destroy();
            this.snowballs.splice(i, 1);
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
      this.raccoons.push({ sprite, alive: true });
    }

    updateRaccoons(dt) {
      const playerBounds = this.barron.getBounds();

      for (let i = this.raccoons.length - 1; i >= 0; i -= 1) {
        const raccoon = this.raccoons[i];
        raccoon.sprite.x -= RACCOON_SPEED * dt;

        if (raccoon.sprite.x < -60) {
          raccoon.sprite.destroy();
          this.raccoons.splice(i, 1);
          continue;
        }

        if (!raccoon.alive) continue;

        if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, raccoon.sprite.getBounds())) {
          const raccoonBounds = raccoon.sprite.getBounds();
          const stompHit = this.barronVy > 0 && playerBounds.bottom <= raccoonBounds.top + 8;
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

    checkMeet() {
      const barronBounds = this.barron.getBounds();
      const ninaBounds = this.nina.getBounds();
      return Phaser.Geom.Intersects.RectangleToRectangle(barronBounds, ninaBounds);
    }

    triggerMeet() {
      this.met = true;
      this.messageBox.setVisible(true);
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

    createSnowballTexture() {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 3, 3);
      g.generateTexture("snowball", 3, 3);
      g.destroy();
    }

    createRaccoonTexture() {
      const g = this.add.graphics();
      const width = 28;
      const height = 16;

      g.fillStyle(0x2f2f2f, 1);
      g.fillRoundedRect(0, 4, width, 10, 3);
      g.fillStyle(0x4f4f4f, 1);
      g.fillRoundedRect(4, 0, 10, 8, 2);
      g.fillStyle(0x1a1a1a, 1);
      g.fillRect(6, 4, 6, 2);
      g.fillStyle(0x6f6f6f, 1);
      g.fillRect(18, 6, 8, 4);
      g.fillStyle(0x3a3a3a, 1);
      g.fillRect(20, 6, 2, 4);
      g.fillRect(24, 6, 2, 4);

      g.generateTexture("raccoon", width, height);
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
    },
    scene: [MeetingScene],
  };

  new Phaser.Game(config);
})();
