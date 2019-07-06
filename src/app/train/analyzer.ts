import * as brain from "brain.js/browser";
import { LowerCasePipe } from '@angular/common';

console.log('analyzer.ts');

export class Analyzer {
    constructor(
        public imageData: ImageData,
        public net: brain.NeuralNetwork,
    ) {
        this.width = imageData.width;
        this.height = imageData.height;
        this.data = imageData.data;
        this.length = imageData.data.length;
    }

    width: number;
    height: number;
    data: Uint8ClampedArray;
    length: number;

    getOffset(x, y) {
        return (x + (y * this.width)) * 4;
    }

    getR(x, y) {
        let offset = this.getOffset(x, y);
        if (offset < 0 || offset >= this.length) {
            return 0;
        }
        return this.data[offset];
    }

    getB(x, y) {
        let offset = this.getOffset(x, y);
        if (offset < 0 || offset >= this.length) {
            return 0;
        }
        return this.data[offset + 2];
    }

    /**
     * Simple blue value lookup, find internal area where blues are >= 0x80.  The area may
     * be weird, and have to be rotated and transformed to make a rectangle.
     */
    findBounds(useRed: boolean = true, strip: boolean = false): any {
        let mins = this.findCenterMins();

        let x = this.width / 2;
        let y = this.height / 2;

        let cols = [];

        let get = useRed ? this.getR.bind(this) : this.getB.bind(this);
        let min = useRed ? mins.r - 8 : mins.b - 8;

        let isOk = (x, y) => {
            if (this.getB(x, y) >= 0x70) {
                return true;
            }
            for (let o = 0; o < 8; o++) {
                if (this.getB(x + o, y + o) >= min && this.getB(x - o, y - o) >= min) {
                    return true;
                }
                if (this.getB(x - o, y + o) >= min && this.getB(x + o, y - o) >= min) {
                    return true;
                }
            }
            return false;
        };

        let addVerticalBounds = (col, y) => {
            let y1 = y - 1;
            let y2 = y + 1;
            while (y1 > 0 && isOk(col, y1)) y1--;
            while (y2 < this.height && isOk(col, y2)) y2++;
            cols.push({ x: col, y1, y2 });
        };

        let ypos = y;
        for (let c = x; c < this.width && (isOk(c, ypos) || isOk(c, ypos - 4) || isOk(c, ypos + 4)); c++) {
            addVerticalBounds(c, ypos);
            let col = cols[cols.length - 1];
            ypos = Math.trunc((col.y1 + col.y2) / 2);
        }

        ypos = y;
        for (let c = x - 1; c >= 0 && isOk(c, ypos); c--) {
            addVerticalBounds(c, ypos);
            let col = cols[cols.length - 1];
            ypos = Math.trunc((col.y1 + col.y2) / 2);
        }

        cols.sort((a, b) => {
            if (a.x < b.x) return -1;
            if (a.x > b.x) return 1;
        });

        // bounds has column index for corners:
        //
        //  ab
        //  dc
        //
        // so col[a].x, col[a].y1 is top-left
        //    col[b].x, col[b].y1 is top-right
        //    col[c].x, col[c].y2 is bottom-right
        //    col[d].x, col[d].y1 is bottom-right
        let bounds: any = {};

        // let's start at middle top and move left.  can go down 1, MAYBE 2, but not more than once
        bounds.a = Math.trunc(cols.length / 2);
        while (bounds.a >= 0) {
            if (bounds.a === 0) break;
            let y = cols[bounds.a].y1;
            let otherY = cols[bounds.a - 1].y1;

            // other lower value is better meaning 'up' on image
            // so otherY = 0 and y = 100 is fine
            // also allow for 2 pixels in the other direction, so otherY = 10 and y = 8 is also fine
            if (otherY - y <= 2) {
                bounds.a--;
            } else {
                break;
            }
        }

        bounds.d = Math.trunc(cols.length / 2);
        while (bounds.d >= 0) {
            if (bounds.d === 0) break;
            let y = cols[bounds.d].y2;
            let otherY = cols[bounds.d - 1].y2;
            if (otherY - y >= -2) {
                bounds.d--;
            } else {
                break;
            }
        }

        // let's start at middle top and move left.  can go down 1, MAYBE 2, but not more than once
        bounds.b = Math.trunc(cols.length / 2);
        while (bounds.b < cols.length) {
            if (bounds.b === (cols.length - 1)) break;
            let y = cols[bounds.b].y1;
            let otherY = cols[bounds.b + 1].y1;

            // other can be less, or up to 2  higher
            if (otherY - y <= 2) {
                bounds.b++;
            } else {
                break;
            }
        }

        bounds.c = Math.trunc(cols.length / 2);
        while (bounds.c < cols.length) {
            if (bounds.c === (cols.length - 1)) break;
            let y = cols[bounds.c].y2;
            let otherY = cols[bounds.c + 1].y2;
            if (otherY - y >= -2) {
                bounds.c++;
            } else {
                break;
            }
        }

        return {
            cols,
            bounds,
            ax: cols[bounds.a].x,
            ay: cols[bounds.a].y1,
            bx: cols[bounds.b].x,
            by: cols[bounds.b].y1,
            cx: cols[bounds.c].x,
            cy: cols[bounds.c].y2,
            dx: cols[bounds.d].x,
            dy: cols[bounds.d].y2,
        };

        // let slopes = [];
        // for (let i = 1; i < cols.length; i++) {
        //     slopes.push({ top: cols[i].y1 - cols[i-1].y1, bottom: cols[i].y2 - cols[i-1].y2 });
        // }

        // slope across the middle of the puzzle top and bottom
        // let midSlopes = this.getSlopes(cols);

        // let leftMin = 0, leftMax = 0, rightMin = cols.length - 1, rightMax = cols.length - 1;
        // for (let i = 1; i < cols.length * 0.3; i++) {
        //     let col = cols[i];
        //     if (col.y1 < cols[leftMin].y1) leftMin = i;
        //     if (col.y2 < cols[leftMax].y2) leftMax = i;
        // }
        // for (let i = cols.length - 2; i >= cols.length * 0.7; i++) {
        //     let col = cols[i];
        //     if (col.y1 < cols[rightMin].y1) rightMin = i;
        //     if (col.y2 < cols[rightMax].y2) rightMax = i;
        // }


        // simple strip, if less than 1/2 the height of the average, remove
        // let totalHeight = cols.reduce((p, c) => p + (c.y2 - c.y1), 0);
        // let heightLimit = (totalHeight / cols.length) * 0.2;
        // while (cols.length > 3) {
        //     let col = cols[0];
        //     if ((col.y2 - col.y1) < heightLimit) {
        //         cols.unshift();
        //     } else {
        //         break;
        //     }
        // }
        // while (cols.length > 3) {
        //     let col = cols[cols.length - 1];
        //     if ((col.y2 - col.y1) < heightLimit) {
        //         cols.pop();
        //     } else {
        //         break;
        //     }
        // }


        if (strip) {
            // get rid of left side parts that are too short, must be border
            while (cols.length > 3) {
                let h1 = cols[0].y2 - cols[0].y1;
                let h2 = cols[2].y2 - cols[2].y1;
                if (Math.abs(h2 - h1) > 8) {
                    cols.shift();
                } else {
                    break;
                }
            }

            while (cols.length > 3) {
                let h1 = cols[cols.length - 1].y2 - cols[cols.length - 1].y1;
                let h2 = cols[cols.length - 3].y2 - cols[cols.length - 3].y1;
                if (Math.abs(h2 - h1) > 8) {
                    cols.pop();
                } else {
                    break;
                }
            }
        }

        console.log('sorted cols:', cols);
        return cols;
    }

    getSlopes(cols) {
        let mid = Math.trunc(cols.length / 2);
        if (mid < 75) {
            console.log('cols:', cols);
            return null; // (have to be at least 150 pixels wide)
        }
        let a = cols[mid + 40].y1;
        let b = cols[mid - 40].y1;
        let c = cols[mid + 40].y2;
        let d = cols[mid + 40].y2;
        let slopes = { top: (b - a) / 80, bottom: (c - d) / 80 };
        console.log(`a: ${a}, b: ${b}, top: ${slopes.top}, c: ${c}, d: ${d}, bottom: ${slopes.bottom}`);
        return slopes;
    }

    findCorners(cols, slopes) {
        // take top-left and keep moving left and possibly down (if top slope is negative), then try to move up 1

    }

    findCenterMins() {
        let start = window.performance.now();
        let midX = this.width / 2;
        let midY = this.height / 2;
        let reds = [];
        let greens = [];
        let blues = [];
        let mins = { r: 255, g: 255, b: 255 };
        for (let x = midX - 40; x <= midX + 40; x++) {
            for (let y = midY - 40; y <= midY + 40; y++) {
                let offset = this.getOffset(x, y);
                let r = this.data[offset];
                let g = this.data[offset + 1];
                let b = this.data[offset + 2];
                mins.r = Math.min(mins.r, r);
                mins.g = Math.min(mins.g, g);
                mins.b = Math.min(mins.b, b);
                reds.push(r);
                greens.push(g);
                blues.push(b);
            }
        }
        console.log('findCenterMins()', window.performance.now() - start, JSON.stringify(mins));

        return mins;
    }

    getTransformedImage(bounds): ImageData {
        let sqr = a => a * a;

        let topX = Math.round(bounds.bx - bounds.ax);
        let topY = Math.round(bounds.by - bounds.ay);
        let bottomX = Math.round(bounds.cx - bounds.dx);
        let bottomY = Math.round(bounds.cy - bounds.dy);
        let leftX = Math.round(bounds.dx - bounds.ax);
        let leftY = Math.round(bounds.dy - bounds.ay);
        let rightX = Math.round(bounds.cx - bounds.bx);
        let rightY = Math.round(bounds.cy - bounds.by);

        let dTop = Math.sqrt(sqr(topX) + sqr(topY));
        let dBottom = Math.sqrt(sqr(bottomX) + sqr(bottomY));
        let dLeft = Math.sqrt(sqr(leftX) + sqr(leftY));
        let dRight = Math.sqrt(sqr(rightX) + sqr(rightY));

        console.log(JSON.stringify({ topX, topY, bottomX, bottomY }, null, 2));
        console.log(JSON.stringify({ dTop, dBottom, dLeft, dRight }, null, 2));

        let width = Math.round((dTop + dBottom) / 2) + 1;
        let height = Math.round((dLeft + dRight) / 2) + 1;

        let id = new ImageData(width, height);
        let strings = [];

        for (let x = 0; x < width; x++) {
            let frac = x / (width - 1);
            let top = { x: bounds.ax + topX * frac, y: bounds.ay + topY * frac };
            let bottom = { x: bounds.dx + bottomX * frac, y: bounds.dy + bottomY * frac };
            strings.push(`x: ${x}, top: ${top.x}, ${top.y}, bottom: ${bottom.x}, ${bottom.y}}`);

            let dx = bottom.x - top.x;
            let dy = bottom.y - top.y;
            for (let y = 0; y < height; y++) {
                let fy = y / (height - 1);
                let ix = Math.round(top.x + fy * dx);
                let iy = Math.round(top.y + fy * dy);
                let offset = (this.imageData.width * iy + ix) * 4;
                let offsetResult = (y * width + x) * 4;
                id.data[offsetResult++] = this.data[offset++];
                id.data[offsetResult++] = this.data[offset++];
                id.data[offsetResult++] = this.data[offset++];
                id.data[offsetResult++] = this.data[offset++];
            }
        }

        window['bounds'] = bounds;
        window['strings'] = strings;
        return id;
    }
}
