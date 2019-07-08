export class DigitAnalyzer {
    constructor(
        public imageData: ImageData,
    ) {
        this.xLow = this.yLow = 0;
        this.xHigh = imageData.width - 1;
        this.yHigh = imageData.height - 1;
    }

    xLow: number;
    xHigh: number;
    yLow: number;
    yHigh: number;

    isBlank(x, y) {
        if (x < 0 || x >= this.imageData.width || y < 0 || y >= this.imageData.height) {
            return false;
        }
        let offset = (y * this.imageData.width + x) * 4;
        if (this.imageData.data[offset + 2] >= 0x40) {
            return true;
        }
        return false;
    }


    getBlankCountRow(y, a, b) {
        let blankCount = 0;
        for (let i = a; i <= b; i++) {
            if (this.isBlank(i, y)) {
                blankCount++;
            }
        }
        return blankCount;
    }

    getBlankCountCol(x, a, b) {
        let blankCount = 0;
        for (let i = a; i <= b; i++) {
            if (this.isBlank(x, i)) {
                blankCount++;
            }
        }
        return blankCount;
    }

    /**
     * Return true if the line is a blank
     * @param y y location in ImageData
     */
    isBlankRow(y, a = 0, b = 0): boolean {
        a = a || this.xLow;
        b = b || this.xHigh;
        let blankCount = this.getBlankCountRow(y, a, b);
        if (b - a - blankCount > 5) {
            return false;
        }
        return true;
    }
    /**
     * Return true if the line is a blank
     * @param y y location in ImageData
     */
    isBlankCol(x, a = 0, b = 0): boolean {
        a = a || this.yLow;
        b = b || this.yHigh;
        let blankCount = this.getBlankCountCol(x, a, b);
        if (b - a - blankCount > 5) {
            return false;
        }
        return true;
    }

    findRowsAndCols() {
        // step 1, find first and last blank row
        let midX = (this.xLow + this.xHigh) / 2;
        for (let y = this.yLow; y <= this.yHigh; y++) {
            if (this.isBlankRow(y, midX - 50, midX + 50)) {
                this.yLow = y;
                break;
            }
        }
        for (let y = this.yHigh; y >= this.yLow; y--) {
            if (this.isBlankRow(y, midX - 50, midX + 50)) {
                this.yHigh = y;
                break;
            }
        }

        // step 2, find first and last blank column
        let midY = (this.yLow + this.yHigh) / 2;
        for (let x = this.xLow; x <= this.xHigh; x++) {
            if (this.isBlankCol(x, midY - 50, midY + 50)) {
                this.xLow = x;
                break;
            }
        }
        for (let x = this.xHigh; x >= this.xLow; x--) {
            if (this.isBlankCol(x, midY - 50, midY + 50)) {
                this.xHigh = x;
                break;
            }
        }

        let colCounts = [];
        let rowCounts = [];
        for (let x = 0; x < this.imageData.width; x++) {
            colCounts.push(this.imageData.height - this.getBlankCountCol(x, 0, this.imageData.height));
        }
        for (let y = 0; y < this.imageData.height; y++) {
            rowCounts.push(this.imageData.width - this.getBlankCountRow(y, 0, this.imageData.width));
        }
        console.log('colCounts:', colCounts);
        console.log('rowCounts:', rowCounts);
        console.log(`x: ${this.xLow} - ${this.xHigh}`);
        console.log(`y: ${this.yLow} - ${this.yHigh}`);

        let cols = [];
        let inCol = false;
        let colStart = -1;
        for (let x = this.xLow; x <= this.xHigh; x++) {
            if (this.isBlankCol(x)) {
                if (inCol) {
                    cols.push({ x1: colStart - 1, x2: x });
                    inCol = false;
                }
            } else {
                if (!inCol) {
                    inCol = true;
                    colStart = x;
                }
            }
        }

        let rows = [];
        let inRow = false;
        let rowStart = -1;
        for (let y = this.yLow; y <= this.yHigh; y++) {
            if (this.isBlankRow(y)) {
                if (inRow) {
                    rows.push({ y1: rowStart - 1, y2: y });
                    inRow = false;
                }
            } else {
                if (!inRow) {
                    inRow = true;
                    rowStart = y;
                }
            }
        }

        return { rows, cols, rowCounts, colCounts };
    }
}