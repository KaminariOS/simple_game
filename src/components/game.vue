<template>
  <div>
    <canvas ref="canvas" width="400" height="400"></canvas>
  </div>
</template>

<script lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

type Point = { x: number; y: number };
type Velocity = { x: number; y: number };
type Square = { length: number };
type Circle = { radius: number };
const G = 0.1;

class CanvasObject {
    actualShape: Square | Circle;
    center: Point;
    rotation: number;
    color: string;
    childObjects: CanvasObject[];
    velocity: Velocity;
    spin: number;

    constructor(
        actualShape: Square | Circle,
        center: Point,
        color: string = "white",
        spin: number = 0.01,
        rotation: number = 0.0,
        velocity: Velocity = {x: 0.1, y: 0.1},
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

    updateinner(canvas: HTMLCanvasElement) {
        this.rotation += this.spin;
        const width = canvas.width;
        const height = canvas.height;
        this.center.x += this.velocity.x;
        this.center.y += this.velocity.y;
        if (this.velocity.y != 0) {
            this.velocity.y += G;
        }
        let hitRadius: number;
        const actualShape = this.actualShape; 
        if ('radius' in actualShape) {
            hitRadius = actualShape.radius;
        } else if ('length' in actualShape) {
            hitRadius = actualShape.length / 2;
        }
        if (this.center.x <= hitRadius || this.center.x + hitRadius >= width) {
            this.velocity.x = -this.velocity.x;
        }
        if (this.center.y <= hitRadius || this.center.y + hitRadius >= height) {
            this.velocity.y = -this.velocity.y;
        }
    }

    update(canvas: HTMLCanvasElement) {
        this.updateinner(canvas);
        this.childObjects.forEach(c => c.update(canvas));
    }

}

export default {
  setup() {
    const canvas = ref<HTMLCanvasElement | null>(null);
    const resizeCanvas = () => {
      if (canvas.value) {
        // Set canvas width to half of the viewport width
        canvas.value.width = window.innerWidth * 0.9;
        // Set canvas height to the viewport height
        canvas.value.height = window.innerHeight * 0.9;
      }
    };
    let animationFrameId: number;

    onMounted(() => {
      const ctx = canvas.value?.getContext('2d');
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas); 

      if (ctx) {
        const center = { x: canvas.value.width / 2, y: canvas.value.height / 2 };
        const square = new CanvasObject(
          { radius: 60 },
          center,
          'blue',
            0.01,
            0,
            {x: 1, y: 1},
            [new CanvasObject({length: 30}, {x: 80, y: 80}, 'green', 0.02, 0, {x: 0.0, y: 0.0}, [
                new CanvasObject({length: 10}, {x: 30, y: 30}, 'red', -0.04, 0, {x: 0., y: 0})
            ])]
        );

        const animate = () => {
          if (ctx) {
            ctx.clearRect(0, 0, canvas.value.width, canvas.value.height); // Clear the canvas
              if (canvas) {
                square.update(canvas.value); // Update the rotation
              } 

            square.draw(ctx); // Draw the square
            animationFrameId = requestAnimationFrame(animate); // Request the next frame
          }
        };

        animate();
      }
    });

    onUnmounted(() => {
      cancelAnimationFrame(animationFrameId);
    });

    return {
      canvas
    };
  }
};
</script>

<style scoped>
canvas {
  border: 1px solid #000;
  background: white;
}
</style>

