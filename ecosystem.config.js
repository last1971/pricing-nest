module.exports = {
    apps: [
        {
            name: 'pricing',
            script: 'dist/main.js',
            watch: true,
            env: {
                NO_COLOR: true,
            },
            nodeArgs: '--tls-cipher-list=DEFAULT@SECLEVEL=0',
        },
    ],
};
