import * as http from 'http';
import * as httpProxy from 'http-proxy';
import { get, set } from './store';
import { error, info, log } from './logger';
import { args } from './args';

const port = parseInt(args.port, 10);
const target = args.target;
if (!target) {
    error('Please provide target url: -t <target>');
}

info('Starting....');
const proxy = httpProxy.createProxyServer();

proxy.on('proxyRes', (proxyRes, req, res) => {
    set(req, proxyRes);
});

const server = http.createServer((req, res) => {
    const cache = get(req, res);
    if (!cache) {
        info(`-> ${req.url}`);
        proxy.web(req, res, {
            target,
            secure: false,
            autoRewrite: true,
            changeOrigin: true
        });
    } else {
        log(`from cache -> ${req.url}`);
    }
});
server.listen(port);
server.on('listening', () => info(`Proxy listening: localhost:${port} -> ${target}`));
server.on('error', console.error);


