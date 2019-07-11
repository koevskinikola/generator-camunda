'use strict';
const Generator = require('yeoman-generator');
// TODO: switch to recommended NPM Download package (https://www.npmjs.com/package/download)
const remote = require('yeoman-remote');
const path = require('path');
const chalk = require('chalk');
const yosay = require('yosay');
const sprintf = require('sprintf-js').sprintf;
const supportedEnvironments = require('./config/supportedEnvironments.json');

module.exports = class extends Generator {

  constructor(args, opts) {
    super(args, opts);

    this.applicationServers = supportedEnvironments.applicationServers;
    this.databases = supportedEnvironments.databases;
    this.jdkVersions = supportedEnvironments.jdkVersions;
  }

  welcomeUser() {
    this.log(
      yosay(`Welcome to the ${chalk.red('Camunda BPM Platform')} generator!`)
    );
  }

  pickApplicationServer_name() {

    const prompts = [
      {
        type: 'list',
        name: 'applicationServer',
        message: 'What application server would you like to use?',
        choices: Object.keys(this.applicationServers),
        default: 0
      }
    ];

    return this.prompt(prompts).then(props => {
      this.applicationServer = this.applicationServers[props.applicationServer];
      this.applicationServer.name = props.applicationServer;
    });
  }

  pickApplicationServer_version() {

    const prompts = [
      {
        type: 'list',
        name: 'applicationServerVersion',
        message: 'What application server version would you like to use?',
        choices: this.applicationServer.versions,
        default: this.applicationServer.versions.length - 1
      }
    ];

    return this.prompt(prompts).then(props => {
      this.applicationServer.version = props.applicationServerVersion;
    });
  }

  pickDatabase_name() {

    const prompts = [
      {
        type: 'list',
        name: 'database',
        message: 'What database would you like to use?',
        choices: Object.keys(supportedEnvironments.databases),
        default: 0
      }
    ];

    return this.prompt(prompts).then(props => {
      this.database = this.databases[props.database];
      this.database.name = props.database;
    });
  }

  pickDatabase_version() {

    const prompts = [
      {
        type: 'list',
        name: 'databaseVersion',
        message: 'What database version would you like to use?',
        choices: this.database.versions,
        default: this.database.versions.length - 1
      },
      {
        type: 'input',
        name: 'databaseAddress',
        message: 'Enter your database address?',
        default: "127.0.0.1",
        validate: function(value) {
          var pass = value.match(
            /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/i
          );
          if (pass) {
            return true;
          }

          return 'Please enter a valid IPv4 address';
        }
      },
      {
        type: 'input',
        name: 'databasePort',
        message: 'Enter your database port?',
        default: this.database.defaultPort,
        validate: function(value) {
          var pass = value.match(
            /^([0-9]{1,5})$/i
          );
          if (pass) {
            return true;
          }

          return 'Please enter a valid IPv4 port.';
        }
      },
      {
        type: 'input',
        name: 'databaseName',
        message: 'Please enter your database name:',
        default: this.database.defaultDbName
      },
      {
        type: 'input',
        name: 'databaseUser',
        message: 'Please enter your database user:',
        default: "camunda"
      },
      {
        type: 'password',
        message: 'Please enter your database password:',
        name: 'databasePassword',
        mask: '*'
      }
    ];

    return this.prompt(prompts).then(props => {
      this.database.version = props.databaseVersion;
      this.database.address = props.databaseAddress;
      this.database.port = props.databasePort;
      this.database.dbName = props.databaseName;
      this.database.user = props.databaseUser;
      this.database.password = props.databasePassword;
    });
  }

  pickJdkVersion() {

    const prompts = [
      {
        type: 'list',
        name: 'jdkVersion',
        message: 'What version of Java are you using?',
        choices: supportedEnvironments.jdkVersions,
        default: supportedEnvironments.jdkVersions.length - 1
      }
    ];

    return this.prompt(prompts).then(props => {
      this.jdkVersion = props.jdkVersion;

      // deal with PostgreSQL JDK7 compatibility
      if (this.database.name == "PostgreSQL" && props.jdkVersion == 7) {
        this.database.jdbcVersion = this.database.jdbcVersion + "jre7"
      }

      // deal with SqlServer JDK compatibility
      if (this.database.name == "Microsoft SQL Server") {
        var jre = (props.jdkVersion > 7)? 8 : 7;
        this.database.jdbcVersion = this.database.jdbcVersion + jre;
      }

      // TODO: deal with OJDBC compatiility matrix
    });
  }

  downloadAndExtranctApplicationServer() {
    this.log("Downloading the application server!");
    var asLink = sprintf(this.applicationServer.link, this.applicationServer.version, this.applicationServer.version);
    remote.extract(asLink, this.destinationPath("./" + this.applicationServer.shortName), {strip: 1}, function() {});
  }

  addConfigFile() {
    // TODO: add custom folder name
    var rootFolder = this.applicationServer.shortName + "/";
    switch (this.applicationServer.shortName) {
      case "tomcat":
        this.fs.copy(
          this.templatePath('tomcat/bpm-platform.xml'),
          this.destinationPath(rootFolder + '/conf/bpm-platform.txt')
        );
      case "wildfly":
        // TODO: modify standalone.xml
      case "jboss":
    }
  }

  addDbDriver() {

    var jdbcLink = sprintf(this.database.jdbcLink, this.database.jdbcVersion, this.database.jdbcVersion);
    var jdbcUri = sprintf(this.database.dbString, this.database.address, this.database.port, this.database.dbName,)

    // TODO: add custom folder name
    var rootFolder = this.applicationServer.shortName + "/";
    switch (this.applicationServer.shortName) {
      case "tomcat":
        remote.fetch(
          jdbcLink,
          this.destinationPath(rootFolder + "/" + this.applicationServer.libsPath),
          function() {}
        );
        // TODO: modify server.xml
        break;
      case "wildfly":
        remote.fetch(
          jdbcLink,
          this.destinationPath(rootFolder + this.applicationServer.libsPath + this.database.jbossPath),
          function() {}
        );
        var jarName = jdbcLink.slice(jdbcLink.lastIndexOf('/') + 1);
        this.fs.copy(
          this.templatePath('wildfly/module.xml'),
          this.destinationPath(rootFolder + this.applicationServer.libsPath + this.database.jbossPath)
        );
        // TODO: modify standalone.xml
        break;
      default:
        break;
    }
  }
};
