const compileByVersion = {};

onmessage = (async ({ data }) => {
    const { jobId, input } = data;
    if (!compileByVersion[data.soljson]) {
        importScripts(data.soljson);
        compileByVersion[data.soljson] =
            self.Module.cwrap('solidity_compile', 'string', ['string', 'number']);
    }
    const output = JSON.parse(compileByVersion[data.soljson](JSON.stringify(input)));
    postMessage({
        jobId,
        output
    });
});