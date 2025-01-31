import {dirname, resolve} from 'node:path';
import {fileURLToPath} from "node:url";
const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
    entry: './src/js/index.js',
    output: {
        filename: 'app.js',
        path: resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/i,
                use: [
                    // Creates `style` nodes from JS strings
                    "style-loader",
                    // Translates CSS into CommonJS
                    "css-loader",
                    // Compiles Sass to CSS
                    "sass-loader",
                ],
            },
        ],
    },
};