
class Range {
    low: number;
    high: number;
}

export class PuzzleAnalyzer {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    pixelCount: number;

    constructor(
        public imageData: ImageData,
    ) {
        this.data = imageData.data;
        this.width = imageData.width;
        this.height = imageData.height;
        this.pixelCount = imageData.width * imageData.height;
    }

    /**
     * Get an object with {low, high} values, dropping the top 5% and bottom 2%
     * of values by count.  This will allow you to clamp and spread the values
     * around to get better contrast.
     * 
     * @param values array of 256 values with count for that color value
     */
    getRange(values: Uint32Array): Range {
        let min = this.pixelCount * 0.02;
        let max = this.pixelCount * 0.05;
        let head = 0;
        let tail = 0;
        let lowValue = 0;
        let highValue = 0;
        
        for (let i = 0; i < 256; i++) {
            if (head + values[i] > min) {
                lowValue = i - 1;
                break;
            }
            head += values[i];
        }

        for (let i = 255; i >= 0; i--) {
            if (tail + values[i] > max) {
                highValue = i + 1;
                break;
            }
            tail += values[i];
        }

        let low = Math.max(0, lowValue);
        let high = Math.min(255, highValue);
        
        return { low, high };
    }

    createMap(values: Uint32Array, range: Range): Uint8ClampedArray {
        let map = new Uint8ClampedArray(256);
        let { low, high } = range;
        let mult = (high + 1 - low);

        for (let i = 0; i < 256; i++) {
            let v = (i - low) / mult * 255;
            map[i] = Math.max(0, Math.min(255, v));
        }
        return map;
    }

    /**
     * Scan image and form arrays of r, g, b count each color value
     */
    scan(): ImageData {
        let reds = new Uint32Array(256);
        let greens = new Uint32Array(256);
        let blues = new Uint32Array(256);
        for (let offset = 0; offset < this.data.length; offset ++) {
            reds[this.data[offset++]]++;
            greens[this.data[offset++]]++;
            blues[this.data[offset++]]++;
        }
        let redRange = this.getRange(reds);
        let greenRange = this.getRange(greens);
        let blueRange = this.getRange(blues);

        let redMap = this.createMap(reds, redRange);
        let greenMap = this.createMap(greens, greenRange);
        let blueMap = this.createMap(blues, blueRange);

        let newData = new ImageData(this.width, this.height);
        let nd = newData.data;
        for (let offset = 0; offset < this.data.length; offset++) {
            nd[offset] = redMap[this.data[offset]];
            offset++;
            nd[offset] = greenMap[this.data[offset]];
            offset++;
            nd[offset] = blueMap[this.data[offset]];
            offset++;
            nd[offset] = 255; // a
        }

        return newData;
    }
}