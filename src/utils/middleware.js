import * as logger from "./logger.js";

export const unknownEndpoint = (req, res) => {
	res.status(404).send({ error: `endpoint desconocido` });
};

export const errorHandler = (error, req, res, next) => {
	logger.error(error.message);
	next(error);
};
