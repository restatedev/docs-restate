plugins {
    java
    application
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
    // Restate SDK
    implementation(libs.restate.sdk.http)
    implementation(libs.restate.sdk.lambda)
    implementation(libs.restate.sdk.request.identity)
    implementation(libs.restate.sdk.testing)
    implementation(libs.restate.sdk.interceptor.opentelemetry)
    implementation(libs.restate.sdk.interceptor.micrometer)
    implementation(libs.opentelemetry.sdk)

    implementation(libs.jackson.parameter.names)
    implementation(libs.jackson.datatype.jdk8)
    implementation(libs.jackson.datatype.jsr310)

    implementation(libs.junit.jupiter.api)

    implementation(libs.log4j.core)
}

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(25))
    }
}

application {
    // Enable native access to avoid the JDK native-access warning printed at startup on JDK 23+
    applicationDefaultJvmArgs = listOf("--enable-native-access=ALL-UNNAMED")
}

spotless {
    java {
        googleJavaFormat()
        importOrder()
        removeUnusedImports()
        formatAnnotations()
        toggleOffOn("//", "/n")
    }
}