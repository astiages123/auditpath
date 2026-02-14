export {
    CategoryGrid,
    CourseList,
    JourneyModal,
    ProgramModal,
    ProgressHeader,
    VideoList,
} from "./components";

export * from "./hooks/use-courses";
export { default as coursesData } from "./data/courses.json";
export {
    getCourseColor,
    getCourseIcon,
    getCourseIconColor,
} from "./lib/courses-logic";
export * from "./lib/courses-logic";
