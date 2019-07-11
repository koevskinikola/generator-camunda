'use strict';
const Generator = require('yeoman-generator');
const remote = require('download');
const path = require('path');
const chalk = require('chalk');
const yosay = require('yosay');
const convert = require("xml-js");
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

      this.database.jdbcLink = sprintf(this.database.jdbcLink, this.database.jdbcVersion, this.database.jdbcVersion);
      this.database.jdbcUrl = sprintf(this.database.dbString, this.database.address, this.database.port, this.database.dbName);
      if (this.database.name === 'H2') {
        this.database.jdbcUrl = sprintf(this.database.dbString, this.database.dbName);
      }
    });
  }

  downloadAndExtranctApplicationServer() {
    this.log("Downloading the application server!");
    var asLink = sprintf(this.applicationServer.link, this.applicationServer.version, this.applicationServer.version);
    remote(asLink, ".", {extract: true, strip: 1}).then(() => {

      var serverXml = this.fs.read('./conf/server.xml');
      var serverJson = convert.xml2js(serverXml, {compact: false, spaces: 2});

      this.fs.copyTpl(
        this.templatePath('tomcat/server.xml'),
        this.destinationPath("./camServer.xml"),
        { db: {
            url: this.database.jdbcUrl,
            jdbcClass: this.database.jdbcClass,
            user: this.database.user,
            password: this.database.password
          }
        }
      );
      var camServer = this.fs.read('./camServer.xml')
      var camJson = convert.xml2js(camServer, {compact: false, spaces: 2});
      var resources = camJson.elements[0].elements;

      var newXml = convert.js2xml(
        serverJson,
        {
          compact: false,
          spaces: 2,
          elementNameFn: function(value, currentElement) {
            if (value == 'GlobalNamingResources') {
              var serverArr = currentElement.elements.concat(resources);
              currentElement.elements = serverArr;
            }
            return value;
          }
        }
      );

      this.fs.delete('./conf/server.xml', {suppressErrors: true});
      this.fs.delete('./camServer.xml', {suppressErrors: true});
      this.fs.write('./conf/server.xml', newXml);
    });
  }

  addConfigFile() {
    // TODO: add custom folder name
//    var rootFolder = this.applicationServer.shortName + "/";
    var rootFolder = "./";
    switch (this.applicationServer.shortName) {
      case "tomcat":
        this.fs.copy(
          this.templatePath('tomcat/bpm-platform.xml'),
          this.destinationPath(rootFolder + 'conf/bpm-platform.xml')
        );
      case "wildfly":
        // TODO: modify standalone.xml
      case "jboss":
    }
  }

  addDbDriver(obj) {
    // TODO: add custom folder name
//    var rootFolder = this.applicationServer.shortName + "/";
    var rootFolder = "./";
    switch (this.applicationServer.shortName) {
      case "tomcat":
        remote(
          this.database.jdbcLink,
          rootFolder + this.applicationServer.libsPath
        );
        // TODO: modify server.xml
        break;
      case "wildfly":
        remote(
          this.database.jdbcLink,
          this.destinationPath(rootFolder + this.applicationServer.libsPath + this.database.jbossPath)
        );
        var jarName = this.database.jdbcLink.slice(jdbcLink.lastIndexOf('/') + 1);
        this.fs.copyTpl(
          this.templatePath('wildfly/module.xml'),
          this.destinationPath(rootFolder + this.applicationServer.libsPath + this.database.jbossPath + "module.xml"),
          { jdbcJar: jarName, jdbcModule: this.database.jbossModule }
        );
        // TODO: modify standalone.xml
        break;
      default:
        break;
    }
  }

  addCamundaLibs() {
    var rootFolder = "./";
    var self = this;
    remote(
      "https://app.camunda.com/nexus/repository/camunda-bpm/org/camunda/bpm/tomcat/camunda-tomcat-assembly/7.10.0/camunda-tomcat-assembly-7.10.0.tar.gz",
      this.destinationPath(rootFolder + this.applicationServer.libsPath),
      {
        extract: true,
//        strip: 1,
        filter: file => {
          return !path.dirname(file.path).includes('server/apache') && path.dirname(file.path).includes('lib');
        }
      }
    ).then(files => {
      self.fs.move("./lib/lib/**", self.destinationPath(rootFolder + self.applicationServer.libsPath));
      self.fs.delete("./lib/lib/");
    });
  }

  addCamundaComponents() {
    var rootFolder = "./";
    remote(
      "https://app.camunda.com/nexus/repository/public/org/camunda/bpm/webapp/camunda-webapp-tomcat/7.10.0/camunda-webapp-tomcat-7.10.0.war",
      this.destinationPath(rootFolder + "webapps/")
    );
    remote(
      "https://app.camunda.com/nexus/repository/public/org/camunda/bpm/camunda-engine-rest/7.10.0/camunda-engine-rest-7.10.0-tomcat.war",
      this.destinationPath(rootFolder + "webapps/")
    );
    remote(
      "https://app.camunda.com/nexus/repository/camunda-bpm/org/camunda/bpm/example/camunda-example-invoice/7.10.0/camunda-example-invoice-7.10.0.war",
      this.destinationPath(rootFolder + "webapps/")
    );
  }
};
