<template>
  <div class="flex">
      <p>FPS: {{roundedFps}}</p>
      <p v-if="!gameStart && !gameEnd">Press ↵ to start; use arrow keys to move</p>
      <p v-if="gameStart && !gameEnd">Eat smaller ones and get bigger, or get eaten by bigger ones</p>
      <div v-if="gameEnd">
        <p v-if="win">You are the biggest</p>
        <p v-if="!win">死</p>
      </div>
  </div>
  <div class="card flex flex-wrap gap-4">
    <div class="flex-auto">
        <label for="balls">Balls</label>
        <InputNumber v-model="BALLs" inputId="balls" showButtons fluid />
    </div>
    <div class="flex-auto">
        <label for="BaseRadius">BaseRadius</label>
        <InputNumber v-model="BaseRadius" inputId="BaseRadius" showButtons fluid />
    </div>
  </div>
  <div>
    <canvas ref="canvas" width="400" height="400"></canvas>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

type Point = { x: number; y: number };
type Velocity = { x: number; y: number };
type Square = { length: number };
type Circle = { radius: number };
const G = 0.01;

const ARROWUP = "ArrowUp"; 
const ARROWDOWN = "ArrowDown"; 
const ARROWLEFT = "ArrowLeft"; 
const ARROWRIGHT = "ArrowRight"; 
const ENTER = "Enter";
const keymaps = {"ArrowUp": 0, "ArrowDown": 0, "ArrowLeft": 0, "ArrowRight": 0, "Enter": 0};

class CanvasObject {
    actualShape: Square | Circle;
    center: Point;
    rotation: number;
    color: string;
    childObjects: CanvasObject[];
    velocity: Velocity;
    spin: number;
    player: boolean = false;
    alive: boolean = true;

    constructor(
        actualShape: Square | Circle,
        center: Point,
        color: string = "white",
        spin: number = 0.00,
        rotation: number = 0.0,
        velocity: Velocity = {x: 0.0, y: 0.0},
        childObjects: CanvasObject[] = []
    ) {
        this.actualShape = actualShape;
        this.spin = spin;
        
        this.center = center;
        this.rotation = rotation;
        this.velocity = velocity;
        this.color = color;
        this.childObjects = childObjects;
    }

    drawInner(ctx: CanvasRenderingContext2D) {
        const actualShape = this.actualShape;
        if ('length' in actualShape) { // Check if the shape is a Square
            const halfSize = actualShape.length / 2;
            ctx.fillStyle = this.color;
            ctx.fillRect(-halfSize, -halfSize, actualShape.length, actualShape.length);
        } else if ('radius' in actualShape) { // Check if the shape is a Circle
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, actualShape.radius, 0, 2 * Math.PI);
            ctx.fill();
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.center.x, this.center.y);
        ctx.rotate(this.rotation);
        this.drawInner(ctx);
        this.childObjects.forEach(c => c.draw(ctx));
        ctx.restore();
    }

    updateInner(canvas: HTMLCanvasElement, timestep: number) {
        this.rotation += this.spin;
        const width = canvas.width;
        const height = canvas.height;

        if (this.player) {
            // this.velocity.y += G * timestep;
            const speed = timestep / 100;
            const maxSpeed = 2 * speed;
            if (keymaps[ARROWUP]) {
                this.velocity.y -= speed;
                keymaps[ARROWUP] -= 1;
            }
            if (keymaps[ARROWDOWN]) {
                this.velocity.y += speed;
                keymaps[ARROWDOWN] -= 1;
            }
            if (keymaps[ARROWLEFT]) {
                this.velocity.x -= speed;
                keymaps[ARROWLEFT] -= 1;
            }
            if (keymaps[ARROWRIGHT]) {
                this.velocity.x += speed;
                keymaps[ARROWRIGHT] -= 1;
            }
            const x_sign = this.velocity.x > 0? 1: -1;
            const y_sign = this.velocity.y > 0? 1: -1;
            this.velocity.x = x_sign * Math.min(Math.abs(this.velocity.x), maxSpeed);
            this.velocity.y = y_sign * Math.min(Math.abs(this.velocity.y), maxSpeed);
            
        }

        this.center.x += this.velocity.x * timestep;
        this.center.y += this.velocity.y * timestep;
        let hitRadius: number = this.getHitRadius();
        if (this.center.x < hitRadius || this.center.x + hitRadius > width) {
            this.center.x = Math.max(Math.min(this.center.x, width - hitRadius), hitRadius);
            this.velocity.x = -this.velocity.x;
        }
        if (this.center.y < hitRadius || this.center.y + hitRadius > height) {
            this.center.y = Math.max(Math.min(this.center.y, height - hitRadius), hitRadius);
            this.velocity.y = -this.velocity.y;
        }
    }

    update(canvas: HTMLCanvasElement, timestep: number) {
        this.updateInner(canvas, timestep);
        this.childObjects.forEach(c => c.update(canvas, timestep));
    }

    getHitRadius() {
        let hitRadius: number = 0;
        const actualShape = this.actualShape; 
        if ('radius' in actualShape) {
            hitRadius = actualShape.radius;
        } else if ('length' in actualShape) {
            hitRadius = actualShape.length / 2;
        }
        return hitRadius;
    }

    setHitRadius(radius: number) {
        const actualShape = this.actualShape; 
        if ('radius' in actualShape) {
            actualShape.radius = radius;
        } else if ('length' in actualShape) {
            // TODO: should panic
            actualShape.length = radius;
        }
    }

}

function getRandomColor() {
  // Generate a random integer between 0 and 16777215 (hex for #FFFFFF)
  const randomColor = Math.floor(Math.random() * 16777215).toString(16);

  // Return the color string, padded with zeros if necessary
  return `#${randomColor.padStart(6, '0')}`;
}

export default {
  setup() {

    let gameStart = ref(false);
    let gameEnd = ref(false);
    let win = ref(false);
    const BALLs = ref(10);
    const BaseRadius = ref(10);

    const fps = ref(0);

    const roundedFps = computed(() => Math.round(fps.value));
    let framesThisSecond = 0, lastFpsUpdate = 0;

    let lastFrameTimeMs = 0;
    let delta = 0;
    // We want to simulate 1000 ms / 60 FPS = 16.667 ms per frame every time we run update()
    const timestep = 1000 / 60;

    const canvas = ref<HTMLCanvasElement | null>(null);
    const resizeCanvas = () => {
      if (canvas.value) {
        // Set canvas width to half of the viewport width
        canvas.value.width = window.innerWidth * 0.9;
        // Set canvas height to the viewport height
        canvas.value.height = window.innerHeight * 0.7;
      }
    };
    let animationFrameId: number;

    const handleKeydown = (event: { key: string; }) => {

      if (event.key in keymaps) {
          keymaps[event.key as keyof typeof keymaps] += 1;
      }
      if (event.key === ENTER) {
          gameStart.value = !gameStart.value;
      }
    };

    onMounted(() => {
      window.addEventListener('keydown', handleKeydown);

      const ctx = canvas.value?.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas); 

      if (ctx && canvas && canvas.value) {
        const center = { x: canvas.value.width / 2, y: canvas.value.height / 2 };
        const root = new CanvasObject({radius: 0}, {x: 0, y: 0});
        const square = new CanvasObject(
          { radius: 30 },
          center,
          getRandomColor(),
            0.01,
            0,
            {x: 0.0, y: 0.00000000000},
            [new CanvasObject({length: 30}, {x: 40, y: 40}, getRandomColor(), 0.02, 0, {x: 0.0, y: 0.0}, [
                new CanvasObject({length: 10}, {x: 30, y: 30}, getRandomColor(), -0.04, 0, {x: 0., y: 0})
            ])]
        );
        square.player = true;
        root.childObjects.push(square);

        const animate = (timestamp: number) => {
            delta = timestamp - lastFrameTimeMs; // get the delta time since last frame
            lastFrameTimeMs = timestamp;
            while (delta >= timestep) {
              if (canvas && canvas.value) {
                root.update(canvas.value, timestep); // Update the rotation
              } 
                delta -= timestep;
            }
            if (timestamp > lastFpsUpdate + 1000) { // update every second
                fps.value = 0.25 * framesThisSecond + (1 - 0.25) * fps.value; // compute the new FPS
         
                lastFpsUpdate = timestamp;
                framesThisSecond = 0;
            }
            framesThisSecond++;

            if (canvas && canvas.value) {
                const canvasWidth = canvas.value.width;
                const canvasHeight = canvas.value.height;

                root.childObjects.forEach(c => {
                    if (!c.player) {
                        const xDiff = c.center.x - square.center.x;
                        const yDiff = c.center.y - square.center.y;
                        const dis = xDiff * xDiff + yDiff * yDiff;
                        const cr = c.getHitRadius();
                        const sr = square.getHitRadius();
                        const newr = Math.sqrt(cr * cr + sr * sr);
                        const radiusSum =  + square.getHitRadius();
                        if (radiusSum * radiusSum >= dis && gameStart.value && !gameEnd.value) {
                            if (cr > sr) {
                                square.alive = false;
                                gameEnd.value = true;
                                c.setHitRadius(newr);
                            } else {
                                c.alive = false;
                                square.setHitRadius(newr);
                                if (2 * newr >= canvasWidth || 2 * newr >= canvasHeight) {
                                    gameEnd.value = true;
                                    win.value = true;
                                }
                            }
                        }
                    }
                });
                root.childObjects = root.childObjects.filter(c => c.alive);

                if (root.childObjects.length < BALLs.value) {
                    const r = BaseRadius.value + Math.random() * 30;
                    const x = r + Math.random() * (canvasWidth - 2 * r);
                    const y = r + Math.random() * (canvasHeight - 2 * r);
                    root.childObjects.push(new CanvasObject({radius: r}, {x: x, y: y}, getRandomColor(), 0, 0, {x: 0.1 * Math.random(), y: 0.1 * Math.random()}));
                }

                ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); // Clear the canvas

                if (!win.value && gameEnd.value) {
                    ctx.fillStyle = 'lightred';   // Set the fill color
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
                }
                root.draw(ctx); // Draw the square
                animationFrameId = requestAnimationFrame(animate); // Request the next frame
            }
        };

        requestAnimationFrame(animate);
      }
    });

    onUnmounted(() => {
      cancelAnimationFrame(animationFrameId);
    });

    return {
      roundedFps,
      canvas,
      gameStart,
      gameEnd,
      win,
      BALLs,
      BaseRadius
    };
  }
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
  background: white;
}
.flex {
  display: flex;    /* Enables flexbox */
  justify-content: space-between; /* Optional: spaces items out */
}
</style>

