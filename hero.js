var helpers = {};

// Returns false if the given coordinates are out of range
helpers.validCoordinates = function(board, distanceFromTop, distanceFromLeft) {
  return (!(distanceFromTop < 0 || distanceFromLeft < 0 ||
    distanceFromTop > board.lengthOfSide - 1 || distanceFromLeft > board.lengthOfSide - 1));
};

// Returns the tile [direction] (North, South, East, or West) of the given X/Y coordinate
helpers.getTileNearby = function(board, distanceFromTop, distanceFromLeft, direction) {

  // These are the X/Y coordinates
  var fromTopNew = distanceFromTop;
  var fromLeftNew = distanceFromLeft;

  // This associates the cardinal directions with an X or Y coordinate
  if (direction === 'North') {
    fromTopNew -= 1;
  } else if (direction === 'East') {
    fromLeftNew += 1;
  } else if (direction === 'South') {
    fromTopNew += 1;
  } else if (direction === 'West') {
    fromLeftNew -= 1;
  } else {
    return false;
  }

  // If the coordinates of the tile nearby are valid, return the tile object at those coordinates
  if (helpers.validCoordinates(board, fromTopNew, fromLeftNew)) {
    return board.tiles[fromTopNew][fromLeftNew];
  } else {
    return false;
  }
};

// Returns an object with certain properties of the nearest object we are looking for
helpers.findNearestObjectDirectionAndDistance = function(board, fromTile, tileCallback) {
  // Storage queue to keep track of places the fromTile has been
  var queue = [];

  //Keeps track of places the fromTile has been for constant time lookup later
  var visited = {};

  // Variable assignments for fromTile's coordinates
  var dft = fromTile.distanceFromTop;
  var dfl = fromTile.distanceFromLeft;

  // Stores the coordinates, the direction fromTile is coming from, and it's location
  var visitInfo = [dft, dfl, 'None', 'START'];

  //Just a unique way of storing each location we've visited
  visited[dft + '|' + dfl] = true;

  // Push the starting tile on to the queue
  queue.push(visitInfo);

  // While the queue has a length
  while (queue.length > 0) {

    // Shift off first item in queue
    var coords = queue.shift();

    // Reset the coordinates to the shifted object's coordinates
    var dft = coords[0];
    var dfl = coords[1];

    // Loop through cardinal directions
    var directions = ['North', 'East', 'South', 'West'];
    for (var i = 0; i < directions.length; i++) {

      // For each of the cardinal directions get the next tile...
      var direction = directions[i];

      // ...Use the getTileNearby helper method to do this
      var nextTile = helpers.getTileNearby(board, dft, dfl, direction);

      // If nextTile is a valid location to move...
      if (nextTile) {

        // Assign a key variable the nextTile's coordinates to put into our visited object later
        var key = nextTile.distanceFromTop + '|' + nextTile.distanceFromLeft;

        var isGoalTile = false;
        try {
          isGoalTile = tileCallback(nextTile);
        } catch(err) {
          isGoalTile = false;
        }

        // If we have visited this tile before
        if (visited.hasOwnProperty(key)) {

          //Do nothing--this tile has already been visited

          //Is this tile the one we want?
        } else if (isGoalTile) {

          // This variable will eventually hold the first direction we went on this path
          var correctDirection = direction;

          // This is the distance away from the final destination that will be incremented in a bit
          var distance = 1;

          // These are the coordinates of our target tileType
          var finalCoords = [nextTile.distanceFromTop, nextTile.distanceFromLeft];

          // Loop back through path until we get to the start
          while (coords[3] !== 'START') {

            // Haven't found the start yet, so go to previous location
            correctDirection = coords[2];

            // We also need to increment the distance
            distance++;

            // And update the coords of our current path
            coords = coords[3];
          }

          //Return object with the following pertinent info
          return {
            direction: correctDirection,
            distance: distance,
            coords: finalCoords
          };

          // If the tile is unoccupied, then we need to push it into our queue
        } else if (nextTile.type === 'Unoccupied') {

          queue.push([nextTile.distanceFromTop, nextTile.distanceFromLeft, direction, coords]);

          // Give the visited object another key with the value we stored earlier
          visited[key] = true;
        }
      }
    }
  }

  // If we are blocked and there is no way to get where we want to go, return false
  return false;
};

// Returns the direction of the nearest non-team diamond mine or false, if there are no diamond mines
helpers.findNearestNonTeamDiamondMine = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(mineTile) {
    if (mineTile.type === 'DiamondMine') {
      if (mineTile.owner) {
        return mineTile.owner.team !== hero.team;
      } else {
        return true;
      }
    } else {
      return false;
    }
  }, board);

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject;
};

// Returns the nearest unowned diamond mine or false, if there are no diamond mines
helpers.findNearestUnownedDiamondMine = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(mineTile) {
    if (mineTile.type === 'DiamondMine') {
      if (mineTile.owner) {
        return mineTile.owner.id !== hero.id;
      } else {
        return true;
      }
    } else {
      return false;
    }
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject;
};

// Returns the nearest health well or false, if there are no health wells
helpers.findNearestHealthWell = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(healthWellTile) {
    return healthWellTile.type === 'HealthWell';
  });

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject;
};

// Returns the direction of the nearest enemy with lower health
// (or returns false if there are no accessible enemies that fit this description)
helpers.findNearestWeakerEnemy = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(enemyTile) {
    return enemyTile.type === 'Hero' && enemyTile.team !== hero.team && enemyTile.health < hero.health;
  });

  //Return the direction that needs to be taken to achieve the goal
  //If no weaker enemy exists, will simply return undefined, which will
  //be interpreted as "Stay" by the game object
  return pathInfoObject;
};

// Returns the direction of the nearest enemy
// (or returns false if there are no accessible enemies)
helpers.findNearestEnemy = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;
  var data = null;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(enemyTile) {
    if (enemyTile.type === 'Hero' && enemyTile.team !== hero.team) {
      data = enemyTile;
      return true;
    }
  });

  if (data) {
    Object.keys(data).forEach(function (key) {
      pathInfoObject[key] = data[key];
    });
  }

  return pathInfoObject;
};

// Returns the direction of the nearest friendly champion
// (or returns false if there are no accessible friendly champions)
helpers.findNearestTeamMember = function(gameData) {
  var hero = gameData.activeHero;
  var board = gameData.board;
  var data = null;

  //Get the path info object
  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(heroTile) {
    if (heroTile.type === 'Hero' && heroTile.team === hero.team) {
      data = heroTile;
      return true;
    }
  });

  if (data) {
    Object.keys(data).forEach(function (key) {
      pathInfoObject[key] = data[key];
    });
  }

  //Return the direction that needs to be taken to achieve the goal
  return pathInfoObject;
};

helpers.moveAwayFromAndTowards = function (gameData, enemy, target) {
  var hero = gameData.activeHero;
  var board = gameData.board;
  var allowedDirections = ["North", "East", "South", "West"];
  allowedDirections.splice(allowedDirections.indexOf(enemy.direction), 1);


  var heroTop = hero.distanceFromTop;
  var heroLeft = hero.distanceFromLeft;
  var northTile = board.tiles[heroTop + 1] ? board.tiles[heroTop + 1][heroLeft] : null;
  var eastTile = board.tiles[heroTop][heroLeft + 1];
  var southTile = board.tiles[heroTop - 1] ? board.tiles[heroTop - 1][heroLeft] : null;
  var westTile = board.tiles[heroTop][heroLeft - 1];
  if (allowedDirections.indexOf('North') >= 0 && (!northTile || northTile.type === 'Unoccupied')) {
    allowedDirections.splice(allowedDirections.indexOf('North'), 1);
  }
  if (allowedDirections.indexOf('East') >= 0 && (!eastTile || eastTile.type === 'Unoccupied')) {
    allowedDirections.splice(allowedDirections.indexOf('East'), 1);
  }
  if (allowedDirections.indexOf('South') >= 0 && (!southTile || southTile.type === 'Unoccupied')) {
    allowedDirections.splice(allowedDirections.indexOf('South'), 1);
  }
  if (allowedDirections.indexOf('West') >= 0 && (!westTile || westTile.type === 'Unoccupied')) {
    allowedDirections.splice(allowedDirections.indexOf('West'), 1);
  }

  var pathInfoObject = helpers.findNearestObjectDirectionAndDistance(board, hero, function(tile) {
    return tile.type === target && allowedDirections.indexOf(tile.direction) !== -1;
  });
  return pathInfoObject;
};

helpers.oneEnemyThatICanTake = function (gameData, nearestEnemy) {
  var hero = gameData.activeHero;
  var board = gameData.board;
  var enemies = 0;

  var heroTop = hero.distanceFromTop;
  var heroLeft = hero.distanceFromLeft;
  var northTile = board.tiles[heroTop + 1] ? board.tiles[heroTop + 1][heroLeft] : null;
  var eastTile = board.tiles[heroTop][heroLeft + 1];
  var southTile = board.tiles[heroTop - 1] ? board.tiles[heroTop - 1][heroLeft] : null;
  var westTile = board.tiles[heroTop][heroLeft - 1];

  if (northTile && northTile.type === 'Hero' && northTile.team !== hero.team) {
    enemies++;
  }
  if (eastTile && eastTile.type === 'Hero' && eastTile.team !== hero.team) {
    enemies++;
  }
  if (southTile && southTile.type === 'Hero' && southTile.team !== hero.team) {
    enemies++;
  }
  if (westTile && westTile.type === 'Hero' && westTile.team !== hero.team) {
    enemies++;
  }
  console.log('Can I take one?', enemies, nearestEnemy.health, hero.health);
  return enemies === 1 && nearestEnemy.health <= hero.health;

};

var move = function (gameData) {
  var myHero = gameData.activeHero;

  //Get stats on the nearest health well
  var nearestHealth = helpers.findNearestHealthWell(gameData);

  // Get stats on nearest enemy
  var nearestEnemy = helpers.findNearestEnemy(gameData);

  var nearestTeamMember = helpers.findNearestTeamMember(gameData);

  var nearestMine = (function () {
    var nonTeam = helpers.findNearestNonTeamDiamondMine(gameData);
    var unOwned = helpers.findNearestUnownedDiamondMine(gameData);
    return nonTeam.distance <= unOwned.distance ? nonTeam : unOwned;
  }());


  /*
      BARBARIAN HEALER MINER
   */

  if (myHero.health === 100 || helpers.oneEnemyThatICanTake(gameData, nearestEnemy)) {
    console.log('blooood!');
    return nearestEnemy.direction;
  }

  if (myHero.health <= 80 && nearestTeamMember.distance === 1 && nearestTeamMember.health < 60) {
    return nearestTeamMember.direction;
  }

  if (myHero.health === 100 && nearestMine.distance === 1) {
    return nearestMine.direction;
  }


  /*
      LOW ON HEALTH
   */
  if (nearestHealth.distance === 1 && myHero.health < 100) {
    return nearestHealth.direction;
  }

  if (myHero.health <= 60) {

    if (nearestEnemy.distance < 5) {
      var healthWell = helpers.moveAwayFromAndTowards(gameData, nearestEnemy, 'HealthWell');
      console.log('enemy near, moving to health well or team member');
      return healthWell && healthWell.distance < nearestTeamMember.distance ? healthWell.direction : nearestHealth.distance === 1 ? nearestHealth.direction : nearestTeamMember.distance === 1 ? nearestEnemy.direction : nearestTeamMember.direction;
    } else {
      console.log('moving to nearest health');
      return nearestHealth.direction;
    }

  }

  if (myHero.health < 100 && nearestHealth.distance === 1) {
    //Heal if you aren't full health and are close to a health well already
    console.log('healing myself');
    return nearestHealth.direction;
  }

  /*
      REGROUP
   */
  if (nearestTeamMember && nearestTeamMember.distance > 3) {
    console.log('regrouping');
    return nearestTeamMember.direction;
  }

  /*
      HEAL TEAM MEMBER
   */
  if (nearestTeamMember && nearestTeamMember.distance === 1 && nearestTeamMember.health <= 60) {
    console.log('healing team member');
    return nearestTeamMember.direction;
  }

  /*
      ATTACK
   */
  if (nearestEnemy && nearestEnemy.distance === 1) {
    console.log('attacking');
    return nearestEnemy.direction;
  }

  /*
      MINE
   */
  if (myHero.health > 60 && nearestMine && nearestMine.distance <= 3) {
    console.log('mining');
    return nearestMine.direction;
  }

  console.log('going for enemy', nearestEnemy);
  // Always head for a team member or enemy
  return nearestTeamMember ? nearestTeamMember.direction : nearestEnemy.direction;

};

// // The "Selfish Diamond Miner"
// // This hero will attempt to capture diamond mines (even those owned by teammates).
// var move = function(gameData, helpers) {
//   var myHero = gameData.activeHero;

//   //Get stats on the nearest health well
//   var healthWellStats = helpers.findNearestObjectDirectionAndDistance(gameData.board, myHero, function(boardTile) {
//     if (boardTile.type === 'HealthWell') {
//       return true;
//     }
//   });

//   var distanceToHealthWell = healthWellStats.distance;
//   var directionToHealthWell = healthWellStats.direction;

//   if (myHero.health < 40) {
//     //Heal no matter what if low health
//     return directionToHealthWell;
//   } else if (myHero.health < 100 && distanceToHealthWell === 1) {
//     //Heal if you aren't full health and are close to a health well already
//     return directionToHealthWell;
//   } else {
//     //If healthy, go capture a diamond mine!
//     return helpers.findNearestUnownedDiamondMine(gameData);
//   }
// };

// // The "Coward"
// // This hero will try really hard not to die.
// var move = function(gameData, helpers) {
//   return helpers.findNearestHealthWell(gameData);
// }


// Export the move function here
module.exports = move;
