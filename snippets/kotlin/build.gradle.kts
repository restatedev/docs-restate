plugins {
  application
  kotlin("jvm") version "2.2.10"
  kotlin("plugin.serialization") version "2.2.10"

  // The reflection-based API creates proxies for your services, which requires non-final classes.
  // The all-open plugin makes classes annotated with the Restate annotations open.
  kotlin("plugin.allopen") version "2.2.10"
  id("com.diffplug.spotless") version "7.2.1"
}

allOpen {
  annotation("dev.restate.sdk.annotation.Service")
  annotation("dev.restate.sdk.annotation.VirtualObject")
  annotation("dev.restate.sdk.annotation.Workflow")
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
  // Restate SDK
  implementation(libs.restate.sdk.http.kotlin)
  implementation(libs.restate.sdk.lambda.kotlin)
  implementation(libs.restate.sdk.request.identity)
  implementation(libs.restate.sdk.testing)
  implementation(libs.restate.sdk.interceptor.opentelemetry)
  implementation(libs.restate.sdk.interceptor.micrometer)
  implementation(libs.opentelemetry.sdk)

  implementation(libs.kotlinx.coroutines.core)
  implementation(libs.kotlinx.coroutines.test)
  implementation(libs.kotlinx.serialization.json)

  implementation(libs.junit.jupiter.api)

  implementation(libs.log4j.core)
}

// Provision and run on JDK 25 (via the foojay toolchain resolver).
// Kotlin 2.2 cannot emit JVM 25 bytecode yet, so it falls back to JVM 24 bytecode (which runs fine
// on JDK 25). The Java/Kotlin target-mismatch check is demoted to a warning in gradle.properties.
kotlin { jvmToolchain(25) }

// Set main class
application {
  // Enable native access to avoid the JDK native-access warning printed at startup on JDK 23+
  applicationDefaultJvmArgs = listOf("--enable-native-access=ALL-UNNAMED")

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
