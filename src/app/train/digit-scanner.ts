import * as brain from "brain.js/browser";

export class DigitScanner {
    constructor(
        public id: ImageData,
        public net: brain.NeuralNetwork,
    ) {
    }
}