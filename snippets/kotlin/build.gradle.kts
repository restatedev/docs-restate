plugins {
  application
  kotlin("jvm") version "2.2.10"
  kotlin("plugin.serialization") version "2.2.10"

  id("com.google.devtools.ksp") version "2.2.10-2.0.2"
  id("com.diffplug.spotless") version "7.2.1"
}

repositories {
  // Snapshots repo
  maven {
    name = "Central Portal Snapshots"
    url = uri("https://central.sonatype.com/repository/maven-snapshots/")
  }

  // Maven local for local testing
  //  mavenLocal()

  mavenCentral()
}

dependencies {
  // Annotation processor
  ksp(libs.restate.sdk.api.kotlin.gen)

  // Restate SDK
  implementation(libs.restate.sdk.http.kotlin)
  implementation(libs.restate.sdk.lambda.kotlin)
  implementation(libs.restate.sdk.request.identity)
  implementation(libs.restate.sdk.testing)

  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.kotlinx.coroutines.test)
  implementation(libs.kotlinx.serialization.json)

  implementation(libs.junit.jupiter.api)

  implementation(libs.log4j.core)
}

kotlin { jvmToolchain(21) }

// Set main class
application {
  if (project.hasProperty("mainClass")) {
    mainClass.set(project.property("mainClass") as String)
  } else {
    mainClass.set("develop.GreeterKt")
  }
}

spotless {
  kotlin {
    targetExclude("build/generated/**/*.kt")
    ktfmt()
  }
  kotlinGradle { ktfmt() }
}
