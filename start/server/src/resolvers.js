const { paginateResults } = require("./utils");

/**
 *  resolver
 *
 *  - graphql에 정의된 속성들 수행하기 위한 동작이 정의되어 있음
 *      - MVC 패턴의 Controller와 유사하게 사용될 수 있음
 *      - 데잍를 생서하는 로직이 resolver에 포함되어도 되지만, service 레이어로 한번 분리하여 호출하는 것을 추천
 *  - 함수의 이름은 graphql의 오브젝트 타입, 쿼리, 뮤테이션과 매핑됨
 *  - resolver 함수는 순서대로 4개의 파라미터를 갖음
 *      - parent : 현재 필드의 상위 필드 변수를 가리킴
 *      - args : 현재 필드의 argument를 받음 (아래 launches의 경우 graphql에서 받은 pageSize, after를 args로 받음)
 *      - context : 데이터에 접근할 수 있은 datasource들을 주입 받음(service 권장)
 *      - info : 현재 동작에 대한 상태 정보를 답고 있다(고 한다. 정확하게는 모르겠다.)
 */
module.exports = {
  Query: {
    launches: async (_, { pageSize = 20, after }, { dataSources }) => {
      const allLaunches = await dataSources.launchAPI.getAllLaunches();
      allLaunches.reverse();

      const launches = paginateResults({
        after,
        pageSize,
        results: allLaunches,
      });

      return {
        launches,
        cursor: launches.lenght ? launches[launches.length - 1].cursor : null,

        hasMore: launches.length
          ? launches[launches.length - 1].cursor !==
            allLaunches[allLaunches.length - 1].cursor
          : false,
      };
    },
    launch: (_, { id }, { dataSources }) =>
      dataSources.launchAPI.getLaunchById({ launchId: id }),
    me: (_, __, { dataSources }) => dataSources.userAPI.findOrCreateUser(),
  },

  Mutation: {
    login: async (_, { email }, { dataSources }) => {
      const user = await dataSources.userAPI.findOrCreateUser({ email });
      if (user) {
        user.token = Buffer.from(email).toString("base64");
        return user;
      }
    },

    bookTrips: async (_, { launchIds }, { dataSources }) => {
      const results = await dataSources.userAPI.bookTrips({ launchIds });
      const launches = await dataSources.launchAPI.getLaunchesByIds({
        launchIds,
      });

      return {
        success: results && results.length === launchIds.length,
        message:
          results.length === launches.length
            ? "trips booked successfully"
            : `the following launches couldnt be booked: ${launchIds.filter(
                (id) => !results.includes(id)
              )}`,
      };
    },

    cancelTrip: async (_, { launchId }, { dataSources }) => {
        const result = await dataSources.userAPI.cancelTrip({ launchId });
    
        if (!result) {
          return {
            success: false,
            message: "failed to cancel trip",
          };
        }
    
        const launch = await dataSources.launchAPI.getLaunchById({ launchId });
    
        return {
          success: true,
          message: "trip cancelled",
          launches: [launch],
        };
      },
  },

  Mission: {
    missionPatch: (mission, { size } = { size: "LARGE" }) => {
      return size === "SMALL"
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
