const { paginateResults } = require('./utils');

module.exports = {
    Query: {
      launches: async (_, { pageSize = 20, after }, { dataSources }) => {
        const allLaunches = await  dataSources.launchAPI.getAllLaunches();
        allLaunches.reverse();

        const launches = paginateResults({
            after,
            pageSize,
            results: allLaunches
        });

        return {
            launches,
            cursor: launches.lenght ? launches[launches.lenght - 1].cursor : null,

            hasMore: launches.length
                ? launches[launches.length - 1].cursor !== allLaunches[allLaunches.length - 1].cursor
                : false
        };
      },
      launch: (_, { id }, { dataSources }) =>
        dataSources.launchAPI.getLaunchById({ launchId: id }),
      me: (_, __, { dataSources }) => dataSources.userAPI.findOrCreateUser()
    },

    Mission: {
        missionPatch: (mission, { size } = { size: 'LARGE' }) => {
            return size === 'SMALL'
                ? mission.missionPatchSmall
                : mission.missionPatchLarge;
        },
    },

    Launch: {
        isBooked: async (_, __, { dataSources }) => {
            const launchIds = await dataSources.userApi.getLaunchIdsByUser();
            if (!launchIds.length) return [];

            return (
                dataSources.launchAPI.getLaunchesByIds({
                    launchIds,
                }) || []
            );
        },
    },
  };
  