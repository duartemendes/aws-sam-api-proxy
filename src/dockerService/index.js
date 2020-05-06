import buildContainerOptions from './buildContainerOptions';

const LABEL_KEY = 'aws-sam-api-proxy.api';

export default (docker) => {
  const removeContainers = async (label) => {
    const containersData = await docker.listContainers({ all: true, filters: { label: [label] } });
    console.log(`Found ${containersData.length} containers, removing...`);

    const containers = await Promise.all(containersData.map(({ Id }) => docker.getContainer(Id)));
    return Promise.all(containers.map((container) => container.remove({ force: true })));
  };

  return {
    validateDockerStatus: async () => {
      const dockerStatus = await docker.ping();
      if (dockerStatus.toString() !== 'OK') {
        throw new Error('Docker must be running');
      }
    },
    removeAllContainers: async () => removeContainers(LABEL_KEY),
    removeApiContainers: async (apiName) => removeContainers(`${LABEL_KEY}=${apiName}`),
    pullImages: async (images) => {
      console.log('Pulling required docker images, this might take a while...', images);

      const promises = images.map((image) => new Promise((resolve, reject) => {
        docker.pull(image, (pullErr, stream) => {
          if (pullErr) return reject(pullErr);
          const onFinished = (err, output) => {
          // eslint-disable-next-line no-unused-expressions
            err ? reject(err) : resolve(output);
          };
          const onProgress = (event) => {
            console.log(event.status);
          };

          return docker.modem.followProgress(stream, onFinished, onProgress);
        });
      }));

      await Promise.all(promises);
      console.log('All required docker images have been pulled successfully.');
    },
    createContainers: async (functions, options) => {
      const promises = functions.map(async (fnData) => {
        const containerOptions = buildContainerOptions(fnData, options);

        const container = await docker.createContainer(containerOptions);

        console.log('Starting container', { id: container.id, name: containerOptions.name, exposedPort: fnData.containerPort });
        await container.start();

        return container.id;
      });

      return Promise.all(promises);
    },
  };
};
