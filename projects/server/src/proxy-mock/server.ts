import { IncomingMessage } from 'http';
import * as express from 'express';
import * as HttpProxyServer from 'http-proxy';
import { parse } from 'url';
import { cache, ResponseObject } from './store';
import { args, info, log, say } from '../shared';
import { RequestMethod } from '@prm/shared';

export class ProxyMockServer {
    private port = parseInt(args.port, 10);
    private readonly target: string = args.target;
    private proxy = HttpProxyServer.createProxyServer();
    private server = express();

    constructor() {
        if (!this.target) {
            throw new Error('Please provide target url: -t <target>');
        }
        if (!parse(this.target).protocol) {
            throw new Error(`Please provide target's protocol (http|https)`);
        }
    }

    start() {
        say('Starting....');

        this.proxy.on('proxyRes', async (proxyRes, req, res) => {
            const value = await this.getProxyData(req, proxyRes);
            cache.set(value.key, value);
        });

        this.server.use((req, res, next) => {
            const value = cache.get(req.url);
            if (!value) {
                next();
                return;
            }
            log(`from cache -> ${req.url}`);
            res
                .set(value.headers)
                .status(value.status)
                .set(value.method)
                .send(value.data);
        });
        this.server.use((req, res) => {
            info(`-> ${req.url}`);
            this.proxy.web(req, res, {
                target: this.target,
                secure: false,
                autoRewrite: true,
                changeOrigin: true
            });
        });

        this.server
            .listen(this.port, () => {
                say(`Proxy listening: localhost:${this.port} -> ${this.target}`)
            });
    }

    private async getProxyData(req: IncomingMessage, proxyRes: IncomingMessage): Promise<ResponseObject> {
        return new Promise((resolve) => {
            const data = [];
            proxyRes.on('data', (d) => {
                data.push(d);
            });
            proxyRes.on('close', () => {
                resolve({
                    key: req.url,
                    data: Buffer.concat(data).toString(),
                    headers: proxyRes.headers,
                    status: proxyRes.statusCode,
                    method: req.method.toLowerCase() as RequestMethod,
                });
            });
        });
    }
}
