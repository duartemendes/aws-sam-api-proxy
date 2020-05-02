import buildContainerOptions from './buildContainerOptions';

export default (docker, functions) => ({
  killOldContainers: async () => {
    const label = `aws-sam-api-proxy.api=${process.env.API_NAME}`;
    const containersData = await docker.listContainers({ all: true, filters: { label: [label] } });
    console.log(`Found ${containersData.length} containers for this api, removing...`);

    const containers = await Promise.all(containersData.map(({ Id }) => docker.getContainer(Id)));
    return Promise.all(containers.map((container) => container.remove({ force: true })));
  },
  pullRequiredDockerImages: async () => {
    const dockerImagesWithTag = functions
      .map(({ dockerImageWithTag }) => dockerImageWithTag)
      .filter((value, i, array) => array.indexOf(value) === i);

    console.log('Pulling required docker images, this might take a while...', dockerImagesWithTag);

    const promises = dockerImagesWithTag.map((dockerImageWithTag) => new Promise((resolve, reject) => {
      docker.pull(dockerImageWithTag, (err, stream) => {
        if (err) return reject(err);
        const onFinished = (err, output) => {
          err ? reject(err) : resolve(output);
        };
        const onProgress = (event) => {
          console.log(event.status);
        };
        docker.modem.followProgress(stream, onFinished, onProgress);
      });
    }));

    await Promise.all(promises);
    console.log('All required docker images have been pulled successfully.');
  },
  createContainers: async () => {
    const promises = functions.map(async (fnData) => {
      const options = buildContainerOptions(fnData);

      const container = await docker.createContainer(options);

      console.log('Starting container', { id: container.id, name: options.name, exposedPort: fnData.containerPort });
      await container.start()

      return container.id;
    });

    return Promise.all(promises);
  },
});