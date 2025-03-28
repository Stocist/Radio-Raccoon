const WebSocket = require('ws');
const https = require('https');

const servers = [
    // Amane & AjieDev servers
    {
        host: "lava-v4.ajieblogs.eu.org",
        port: 443,
        password: "https://dsc.gg/ajidevserver",
        secure: true,
        version: "4.x"
    },
    {
        host: "lavalink.serenetia.com",
        port: 443,
        password: "https://dsc.gg/ajidevserver",
        secure: true,
        version: "3.x & 4.x"
    },
    // Disutils servers
    {
        host: "lavalink-1.is-it.pink",
        port: 443,
        password: "https://disutils.com",
        secure: true,
        version: "4.0.8"
    },
    {
        host: "lavalink-2.is-it.pink",
        port: 443,
        password: "https://disutils.com",
        secure: true,
        version: "4.0.8"
    },
    // Nextgencoders server
    {
        host: "lavalink.nextgencoders.xyz",
        port: 443,
        password: "nextgencoders",
        secure: true,
        version: "4.0.8"
    }
];

async function testLavalinkServer(server) {
    console.log(`Testing ${server.host}:${server.port} (${server.version})...`);

    // Test REST API
    const restPromise = new Promise((resolve) => {
        const req = https.get({
            hostname: server.host,
            port: server.port,
            path: '/version',
            headers: {
                Authorization: server.password
            },
            rejectUnauthorized: false
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    data: data
                });
            });
        });

        req.on('error', (error) => {
            resolve({
                status: 'error',
                error: error.message
            });
        });

        req.end();
    });

    // Test WebSocket
    const wsPromise = new Promise((resolve) => {
        const ws = new WebSocket(`wss://${server.host}:${server.port}`, {
            headers: {
                Authorization: server.password,
                'User-Id': '1234567890',
                'Client-Name': 'Lavalink-Tester'
            },
            rejectUnauthorized: false
        });

        const timeout = setTimeout(() => {
            ws.close();
            resolve({
                status: 'timeout',
                error: 'Connection timed out'
            });
        }, 5000);

        ws.on('open', () => {
            clearTimeout(timeout);
            ws.close();
            resolve({
                status: 'success'
            });
        });

        ws.on('error', (error) => {
            clearTimeout(timeout);
            resolve({
                status: 'error',
                error: error.message
            });
        });
    });

    try {
        const [restResult, wsResult] = await Promise.all([restPromise, wsPromise]);
        
        console.log(`\nResults for ${server.host}:`);
        console.log('REST API:', restResult.status === 200 ? '✅ Working' : '❌ Failed');
        console.log('WebSocket:', wsResult.status === 'success' ? '✅ Working' : '❌ Failed');
        
        if (restResult.status === 200) {
            console.log('Version:', restResult.data);
        }
        
        return {
            host: server.host,
            version: server.version,
            working: restResult.status === 200 && wsResult.status === 'success'
        };
    } catch (error) {
        console.error(`Error testing ${server.host}:`, error);
        return {
            host: server.host,
            version: server.version,
            working: false
        };
    }
}

async function testAllServers() {
    console.log('Starting Lavalink server tests...\n');
    
    const results = await Promise.all(servers.map(testLavalinkServer));
    
    console.log('\n=== Summary ===');
    const workingServers = results.filter(r => r.working);
    console.log(`Working servers: ${workingServers.length}/${servers.length}`);
    
    if (workingServers.length > 0) {
        console.log('\nWorking servers:');
        workingServers.forEach(server => {
            console.log(`- ${server.host} (${server.version})`);
        });
    }
    
    return workingServers;
}

testAllServers().then(workingServers => {
    if (workingServers.length > 0) {
        console.log('\nRecommended configuration for your player.js:');
        console.log('```javascript');
        console.log('const nodes = [');
        workingServers.forEach((server, index) => {
            console.log('    {');
            console.log(`        host: "${server.host}",`);
            console.log('        port: 443,');
            console.log(`        password: "${servers.find(s => s.host === server.host).password}",`);
            console.log('        secure: true');
            console.log('    }' + (index < workingServers.length - 1 ? ',' : ''));
        });
        console.log('];');
        console.log('```');
    } else {
        console.log('\nNo working servers found. Please try again later or use alternative servers.');
    }
}); 