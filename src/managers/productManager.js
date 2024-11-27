import paths from "../utils/paths.js";
import { readJsonFile, writeJsonFile, deleteFile } from "../utils/fileHandler.js";
import { generateId } from "../utils/collectionHandler.js";
import ErrorManager from "./errorManager.js";

export default class ProductManager {
    #jsonFilename;
    #products;

    constructor() {
        this.#jsonFilename = "products.json";
        this.#products = [];
    }

    async getAll(limit) {
        try {
            this.#products = await readJsonFile(paths.files, this.#jsonFilename);
            return limit ? this.#products.slice(0, limit) : this.#products;
        } catch (error) {
            throw new ErrorManager("Error al cargar los productos", error.code);
        }
    }

    async #findOneById(id) {
        this.#products = await this.getAll();
        const product = this.#products.find(p => p.id === Number(id));

        if (!product) {
            throw new ErrorManager("Producto no encontrado", 404);
        }
        return product;
    }

    async #isCodeDuplicate(code) {
        this.#products = await this.getAll();
        const duplicate = this.#products.some(product => product.code === code);
        return duplicate;
    }

    async getOneById(id) {
        try {
            return await this.#findOneById(id);
        } catch (error) {
            throw new ErrorManager(error.message, error.code);
        }
    }

    async insertOne(data, file) {
        try {
            const { title, description, code, price, status, stock, category } = data;

            if (!title || !description || !code || price == null || stock == null || !category) {
                throw new ErrorManager("Faltan datos obligatorios", 400);
            }

            if (await this.#isCodeDuplicate(code)) {
                throw new ErrorManager("El código ya existe, debe ser único", 400);
            }

            const newProduct = {
                id: generateId(await this.getAll()),
                title,
                description,
                code,
                price: Number(price),
                status: status !== undefined ? Boolean(status) : true,
                stock: Number(stock),
                category,
                thumbnails: file ? [file.filename] : []
            };

            this.#products.push(newProduct);
            await writeJsonFile(paths.files, this.#jsonFilename, this.#products);

            return newProduct;
        } catch (error) {
            if (file?.filename) await deleteFile(paths.images, file.filename);
            throw new ErrorManager(error.message, error.code);
        }
    }

    async updateOneById(id, data, file) {
        try {
            const productFound = await this.#findOneById(id);
            const updatedThumbnail = file ? file.filename : productFound.thumbnails[0];

            const updatedProduct = {
                ...productFound,
                ...data,
                id: productFound.id,
                price: data.price ? Number(data.price) : productFound.price,
                stock: data.stock ? Number(data.stock) : productFound.stock,
                thumbnails: file ? [...productFound.thumbnails, file.filename] : productFound.thumbnails,
            };

            const index = this.#products.findIndex(p => p.id === productFound.id);
            this.#products[index] = updatedProduct;
            await writeJsonFile(paths.files, this.#jsonFilename, this.#products);

            if (file?.filename && updatedThumbnail !== productFound.thumbnails[0]) {
                await deleteFile(paths.images, productFound.thumbnails[0]);
            }

            return updatedProduct;
        } catch (error) {
            if (file?.filename) await deleteFile(paths.images, file.filename);
            throw new ErrorManager(error.message, error.code);
        }
    }

    async deleteOneById(id) {
        try {
            const productFound = await this.#findOneById(id);

            if (productFound.thumbnails.length > 0) {
                for (const thumbnail of productFound.thumbnails) {
                    await deleteFile(paths.images, thumbnail);
                }
            }

            this.#products = this.#products.filter(p => p.id !== Number(id));
            await writeJsonFile(paths.files, this.#jsonFilename, this.#products);
        } catch (error) {
            throw new ErrorManager(error.message, error.code);
        }
    }
}
