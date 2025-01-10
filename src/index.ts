#!/usr/bin/env node
import { SecondOpinionServer } from './server.js';

const server = new SecondOpinionServer();
server.run().catch(console.error);
