(function () {
  'use strict';

  /**
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * The list of scheduler priorities in order from highest to lowest.
   * @const {!Array<string>}
   */
  var SCHEDULER_PRIORITIES = ['user-blocking', 'user-visible', 'background'];

  /**
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * This class manages scheduling and running callbacks using postMessage.
   * @private
   */
  class PostMessageCallbackMananger {
    /**
     * Construct a PostMessageCallbackMananger, which handles scheduling
     * and running callbacks via a MessageChannel.
     */
    constructor() {
      /**
       * @private
       * @const {!MessageChannel}
       */
      this.channel_ = new MessageChannel();

      /**
       * @private
       * @const {MessagePort}
       */
      this.sendPort_ = this.channel_.port2;

      /**
       * @private
       * @const {!Object<number, function(): undefined>}
       */
      this.messages_ = {};

      /**
       * @private
       * @type {number}
       */
      this.nextMessageHandle_ = 1;
      this.channel_.port1.onmessage = e => this.onMessageReceived_(e);
    }

    /**
     * @param {function(): undefined} callback
     * @return {number} A handle that can used for cancellation.
     */
    queueCallback_(callback) {
      // We support multiple pending postMessage callbacks by associating a handle
      // with each message, which is used to look up the callback when the message
      // is received.
      var handle = this.nextMessageHandle_++;
      this.messages_[handle] = callback;
      this.sendPort_.postMessage(handle);
      return handle;
    }

    /**
     * @param {number} handle The handle returned when the callback was queued.
     */
    cancelCallback_(handle) {
      delete this.messages_[handle];
    }

    /**
     * The onmessage handler, invoked when the postMessage runs.
     * @private
     * @param {!Event} e
     */
    onMessageReceived_(e) {
      var handle = e.data;
      // The handle will have been removed if the callback was canceled.
      if (!(handle in this.messages_)) return;
      var callback = this.messages_[handle];
      delete this.messages_[handle];
      callback();
    }
  }

  /**
   * Get the lazily initialized instance of PostMessageCallbackMananger, which
   * is initialized that way to avoid errors if MessageChannel is not available.
   *
   * @return {!PostMessageCallbackMananger}
   */
  function getPostMessageCallbackManager() {
    if (!getPostMessageCallbackManager.instance_) {
      getPostMessageCallbackManager.instance_ = new PostMessageCallbackMananger();
    }
    return getPostMessageCallbackManager.instance_;
  }

  /** @enum {number} */
  var CallbackType = {
    REQUEST_IDLE_CALLBACK: 0,
    SET_TIMEOUT: 1,
    POST_MESSAGE: 2
  };

  /**
   * HostCallback is used for tracking host callbacks, both for the schedueler
   * entrypoint --- which can be a postMessage, setTimeout, or
   * requestIdleCallback --- and for delayed tasks.
   */
  class HostCallback {
    /**
     * @param {function(): undefined} callback
     * @param {?string} priority The scheduler priority of the associated host
     *     callback. This is used to determine which type of underlying API to
     *     use. This can be null if delay is set.
     * @param {number} delay An optional delay. Tasks with a delay will
     *     ignore the `priority` parameter and use setTimeout.
     */
    constructor(callback, priority, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      /** @const {function(): undefined} */
      this.callback_ = callback;

      /**
       * @private
       * @type {CallbackType}
       */
      this.callbackType_ = null;

      /**
       * Handle for cancellation, which is set when the callback is scheduled.
       * @private
       * @type {?number}
       */
      this.handle_ = null;

      /**
       * @private
       * @type {boolean}
       */
      this.canceled_ = false;
      this.schedule_(priority, delay);
    }

    /**
     * Returns true iff this task was scheduled with requestIdleCallback.
     * @return {boolean}
     */
    isIdleCallback() {
      return this.callbackType_ === CallbackType.REQUEST_IDLE_CALLBACK;
    }

    /**
     * Returns true iff this task was scheduled with MessageChannel.
     * @return {boolean}
     */
    isMessageChannelCallback_() {
      return this.callbackType_ === CallbackType.POST_MESSAGE;
    }

    /**
     * Cancel the host callback, and if possible, cancel the underlying API call.
     */
    cancel() {
      if (this.canceled_) return;
      this.canceled_ = true;
      switch (this.callbackType_) {
        case CallbackType.REQUEST_IDLE_CALLBACK:
          cancelIdleCallback(this.handle_);
          break;
        case CallbackType.SET_TIMEOUT:
          this.handle_.abort();
          break;
        case CallbackType.POST_MESSAGE:
          getPostMessageCallbackManager().cancelCallback_(this.handle_);
          break;
        default:
          throw new TypeError('Unknown CallbackType');
      }
    }

    /**
     * @private
     * @param {?string} priority The scheduler priority of the associated host
     *     callback. This is used to determine which type of underlying API to
     *     use. This can be null if delay is set.
     * @param {number} delay An optional delay. Tasks with a delay will
     *     ignore the `priority` parameter and use setTimeout.
     */
    schedule_(priority, delay) {
      // For the delay case, our only option is setTimeout. This gets queued at
      // the appropriate priority when the callback runs. If the delay <= 0 and
      // MessageChannel is available, we use postMessage below.
      if (delay && delay > 0) {
        this.callbackType_ = CallbackType.SET_TIMEOUT;
        // eslint-disable-next-line no-undef
        (this.handle_ = tSleep(delay / 1e3)).then(() => {
          this.runCallback_();
        });
        return;
      }

      // This shouldn't happen since Scheduler checks the priority before creating
      // a HostCallback, but fail loudly in case it does.
      if (!SCHEDULER_PRIORITIES.includes(priority)) {
        throw new TypeError("Invalid task priority : " + priority);
      }
      if (priority === 'background' && typeof requestIdleCallback === 'function') {
        this.callbackType_ = CallbackType.REQUEST_IDLE_CALLBACK;
        this.handle_ = requestIdleCallback(() => {
          this.runCallback_();
        });
        return;
      }

      // Use MessageChannel if avaliable.
      if (typeof MessageChannel === 'function') {
        this.callbackType_ = CallbackType.POST_MESSAGE;
        // TODO: Consider using setTimeout in the background so tasks are
        // throttled. One caveat here is that requestIdleCallback may not be
        // throttled.
        this.handle_ = getPostMessageCallbackManager().queueCallback_(() => {
          this.runCallback_();
        });
        return;
      }

      // Some JS environments may not support MessageChannel.
      // This makes setTimeout the only option.
      this.callbackType_ = CallbackType.SET_TIMEOUT;
      // eslint-disable-next-line no-undef
      (this.handle_ = tSleep(0)).then(() => {
        this.runCallback_();
      });
    }

    /** Run the associated callback. */
    runCallback_() {
      if (this.canceled_) return;
      this.callback_();
    }
  }

  /**
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * This represents the overall task queuing order and is used for moving tasks
   * between task queues for priority changes.
   * @private
   * @type {number}
   */
  var nextSequence = 0;

  /**
   * An implementation of a task queue that augments the data being stored with
   * pointers to the previous and next entries. Storing the pointers on the data
   * reduces the number of objects created, cutting down on object churn.
   *
   * This task queue is implemented as a doubly-linked list, optimizing for
   * queueing and dequeing, as well as performant merges for priority change.
   *
   * This adds the following properties to tasks it owns:
   *  - tq_sequence_: The overall queueing order.
   *  - tq_prev_: A pointer to the previous task.
   *  - tq_next_: A pointer to the next task.
   */
  class IntrusiveTaskQueue {
    /**
     * Constructs an empty IntrusiveTaskQueue.
     */
    constructor() {
      /**
       * @private
       * @const {!Object}
       */
      this.head_ = null;

      /**
       * @private
       * @const {!Object}
       */
      this.tail_ = null;
    }

    /** @return {boolean} */
    isEmpty() {
      return this.head_ == null;
    }

    /** @param {!Object} task */
    push(task) {
      if (typeof task !== 'object') throw new TypeError('Task must be an Object');
      task.tq_sequence_ = nextSequence++;
      if (this.isEmpty()) {
        task.tq_prev_ = null;
        this.head_ = task;
      } else {
        task.tq_prev_ = this.tail_;
        this.tail_.tq_next_ = task;
      }
      task.tq_next_ = null;
      this.tail_ = task;
    }

    /** @return {?Object} The oldest task or null of the queue is empty. */
    takeNextTask() {
      if (this.isEmpty()) return null;
      var task = this.head_;
      this.remove_(task);
      return task;
    }

    /**
     * Merges all tasks from `sourceQueue` into this task queue for which
     * `selector` returns true . Tasks are insterted into this queue based on
     * their sequence number.
     *
     * @param {!IntrusiveTaskQueue} sourceQueue
     * @param {function(!Object): boolean} selector
     */
    merge(sourceQueue, selector) {
      if (typeof selector !== 'function') {
        throw new TypeError('Must provide a selector function.');
      }
      if (sourceQueue == null) throw new Error('sourceQueue cannot be null');
      var currentTask = this.head_;
      var previousTask = null;
      var iterator = sourceQueue.head_;
      while (iterator) {
        // Advance the iterator now before we mutate it and ivalidate the
        // pointers.
        var taskToMove = iterator;
        iterator = iterator.tq_next_;
        if (selector(taskToMove)) {
          sourceQueue.remove_(taskToMove);
          // Fast-forward until we're just past the insertion point. The new task
          // is inserted between previousTask and currentTask.
          while (currentTask && currentTask.tq_sequence_ < taskToMove.tq_sequence_) {
            previousTask = currentTask;
            currentTask = currentTask.tq_next_;
          }
          this.insert_(taskToMove, previousTask);
          previousTask = taskToMove;
        }
      }
    }

    /**
     * Insert `task` into this queue directly after `parentTask`.
     * @private
     * @param {!Object} task The task to insert.
     * @param {?Object} parentTask The task preceding `task` in this queue, or
     *    null if `task` should be inserted at the beginning.
     */
    insert_(task, parentTask) {
      // We can simply push the new task if it belongs at the end.
      if (parentTask == this.tail_) {
        this.push(task);
        return;
      }

      // `nextTask` is the next task in the list, which should not be null since
      // `parentTask` is not the tail (which is the only task with a null next
      // pointer).
      var nextTask = parentTask ? parentTask.tq_next_ : this.head_;
      task.tq_next_ = nextTask;
      nextTask.tq_prev_ = task;
      task.tq_prev_ = parentTask;
      if (parentTask != null) {
        parentTask.tq_next_ = task;
      } else {
        this.head_ = task;
      }
    }

    /**
     * @private
     * @param {!Object} task
     */
    remove_(task) {
      if (task == null) throw new Error('Expected task to be non-null');
      if (task === this.head_) this.head_ = task.tq_next_;
      if (task === this.tail_) this.tail_ = this.tail_.tq_prev_;
      if (task.tq_next_) task.tq_next_.tq_prev_ = task.tq_prev_;
      if (task.tq_prev_) task.tq_prev_.tq_next_ = task.tq_next_;
    }
  }

  /**
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * Polyfill of the scheduler API: https://wicg.github.io/scheduling-apis/.
   */
  class Scheduler {
    /**
     * Constructs a Scheduler object. There should only be one Scheduler per page
     * since tasks are only run in priority order within a particular scheduler.
     */
    constructor() {
      /**
       * @const {Object<string, !TaskQueue[]>}
       *
       * Continuation and task queue for each priority, in that order.
       */
      this.queues_ = {};
      SCHEDULER_PRIORITIES.forEach(priority => {
        this.queues_[priority] = [new IntrusiveTaskQueue(), new IntrusiveTaskQueue()];
      });

      /*
       * We only schedule a single host callback, which can be a setTimeout,
       * requestIdleCallback, or postMessage, which will run the oldest, highest
       * priority task.
       *
       * TODO(shaseley): consider an option for supporting multiple outstanding
       * callbacks, which more closely matches the current Chromium
       * implementation.
       *
       * @private
       * @type {?HostCallback}
       */
      this.pendingHostCallback_ = null;

      /**
       * This keeps track of signals we know about for priority changes. The
       * entries are (key = signal, value = current priority). When we encounter
       * a new TaskSignal (an AbortSignal with a priority property), we listen for
       * priority changes so we can move tasks between queues accordingly.
       * @const {!WeakMap<!AbortSignal, string>}
       */
      this.signals_ = new WeakMap();
    }

    /**
     * Returns a promise that is resolved in a new task.
     *
     * @return {!Promise<*>}
     */
    yield() {
      // Inheritance is not supported. Use default options instead.
      return this.postTaskOrContinuation_(() => {}, {
        priority: 'user-visible'
      }, true);
    }

    /**
     * Schedules `callback` to be run asynchronously, returning a promise that is
     * resolved with the callback's result when it finishes running. The resulting
     * promise is rejected if the callback throws an exception, or if the
     * associated signal is aborted.
     *
     * @param {function(): *} callback
     * @param {{signal: AbortSignal, priorty: string, delay: number}} options
     * @return {!Promise<*>}
     */
    postTask(callback, options) {
      return this.postTaskOrContinuation_(callback, options, false);
    }

    /**
     * Common scheduling logic for postTask and yield.
     *
     * @param {function(): *} callback
     * @param {{signal: AbortSignal, priorty: string, delay: number}} options
     * @param {boolean} isContinuation
     * @return {!Promise<*>}
     */
    postTaskOrContinuation_(callback, options, isContinuation) {
      // Make a copy since we modify some of the options.
      options = Object.assign({}, options);
      if (options.signal !== undefined) {
        // Non-numeric options cannot be null for this API. Also make sure we can
        // use this object as an AbortSignal.
        if (options.signal === null || !('aborted' in options.signal) || typeof options.signal.addEventListener !== 'function') {
          return Promise.reject(new TypeError("'signal' is not a valid 'AbortSignal'"));
        }
        // If this is a TaskSignal, make sure the priority is valid.
        if (options.signal && options.signal.priority && !SCHEDULER_PRIORITIES.includes(options.signal.priority)) {
          return Promise.reject(new TypeError("Invalid task priority: '" + options.signal.priority + "'"));
        }
      }
      if (options.priority !== undefined) {
        // Non-numeric options cannot be null for this API.
        if (options.priority === null || !SCHEDULER_PRIORITIES.includes(options.priority)) {
          return Promise.reject(new TypeError("Invalid task priority: '" + options.priority + "'"));
        }
      }
      if (options.delay === undefined) options.delay = 0;
      // Unlike setTimeout, postTask uses [EnforceRange] and rejects negative
      // delay values. But it also converts non-numeric values to numbers. Since
      // IDL and Number() both use the same underlying ECMAScript algorithm
      // (ToNumber()), convert the value using Number(delay) and then check the
      // range.
      options.delay = Number(options.delay);
      if (options.delay < 0) {
        return Promise.reject(new TypeError("'delay' must be a positive number."));
      }
      var task = {
        callback,
        options,
        /** The resolve function from the associated Promise.  */
        resolve: null,
        /** The reject function from the associated Promise.  */
        reject: null,
        /** The pending HostCallback, which is set iff this is a delayed task. */
        hostCallback: null,
        /**
         * The callback passed to the abort event listener, which calls
         * `onAbort` and is bound to this task via an => function.
         */
        abortCallback: null,
        onTaskCompleted: function onTaskCompleted() {
          if (!this.options.signal || !this.abortCallback) return;
          this.options.signal.removeEventListener('abort', this.abortCallback);
          this.abortCallback = null;
        },
        onTaskAborted: function onTaskAborted() {
          // If this is a delayed task that hasn't expired yet, cancel the host
          // callback.
          if (this.hostCallback) {
            this.hostCallback.cancel();
            this.hostCallback = null;
          }
          this.options.signal.removeEventListener('abort', this.abortCallback);
          this.abortCallback = null;
          this.reject(this.options.signal.reason);
        },
        isAborted: function isAborted() {
          return this.options.signal && this.options.signal.aborted;
        },
        isContinuation
      };
      var resultPromise = new Promise((resolve, reject) => {
        task.resolve = resolve;
        task.reject = reject;
      });
      this.schedule_(task);
      return resultPromise;
    }

    /**
     * @private
     * @param {!Object} task
     */
    schedule_(task) {
      // Handle tasks that have already been aborted or might be aborted in the
      // future.
      var signal = task.options.signal;
      if (signal) {
        if (signal.aborted) {
          task.reject(signal.reason);
          return;
        }
        task.abortCallback = () => {
          task.onTaskAborted();
        };
        signal.addEventListener('abort', task.abortCallback);
      }

      // Handle delayed tasks.
      if (task.options.delay > 0) {
        task.hostCallback = new HostCallback(() => {
          task.hostCallback = null;
          this.onTaskDelayExpired_(task);
        }, null /* priority */, task.options.delay);
        return;
      }
      this.pushTask_(task);
      this.scheduleHostCallbackIfNeeded_();
    }

    /**
     * Callback invoked when a delayed task's timeout expires.
     * @private
     * @param {!Object} task
     */
    onTaskDelayExpired_(task) {
      // We need to queue the task in the appropriate queue, most importantly
      // to ensure ordering guarantees.
      this.pushTask_(task);

      // We also use this as an entrypoint into the scheduler and run the
      // next task, rather than waiting for the pending callback or scheduling
      // another one.
      if (this.pendingHostCallback_) {
        this.pendingHostCallback_.cancel();
        this.pendingHostCallback_ = null;
      }
      this.schedulerEntryCallback_();
    }

    /**
     * Callback invoked when a priortychange event is raised for `signal`.
     * @private
     * @param {!AbortSignal} signal
     */
    onPriorityChange_(signal) {
      var oldPriority = this.signals_.get(signal);
      if (oldPriority === undefined) {
        throw new Error('Attempting to change priority on an unregistered signal');
      }
      if (oldPriority === signal.priority) return;

      // Change priority for both continuations and tasks.
      for (var i = 0; i < 2; i++) {
        var sourceQueue = this.queues_[oldPriority][i];
        var destinationQueue = this.queues_[signal.priority][i];
        destinationQueue.merge(sourceQueue, task => {
          return task.options.signal === signal;
        });
      }
      this.signals_.set(signal, signal.priority);
    }

    /**
     * Callback invoked when the host callback fires.
     * @private
     */
    schedulerEntryCallback_() {
      this.pendingHostCallback_ = null;
      this.runNextTask_();
      this.scheduleHostCallbackIfNeeded_();
    }

    /**
     * Schedule the next scheduler callback if there are any pending tasks.
     */
    scheduleHostCallbackIfNeeded_() {
      var {
        priority
      } = this.nextTaskPriority_();
      if (priority == null) return;

      // We might need to upgrade to a non-idle callback if a higher priority task
      // is scheduled, in which case we cancel the pending host callback and
      // reschedule.
      if (priority !== 'background' && this.pendingHostCallback_ && this.pendingHostCallback_.isIdleCallback()) {
        this.pendingHostCallback_.cancel();
        this.pendingHostCallback_ = null;
      }

      // Either the priority of the new task is compatible with the pending host
      // callback, or it's a lower priorty (we handled the other case above). In
      // either case, the pending callback is still valid.
      if (this.pendingHostCallback_) return;
      this.pendingHostCallback_ = new HostCallback(() => {
        this.schedulerEntryCallback_();
      }, priority, 0 /* delay */);
    }

    /**
     * Compute the `task` priority and push it onto the appropriate task queue.
     * If the priority comes from the associated signal, this will set up an event
     * listener to listen for priority changes.
     * @private
     * @param {!Object} task
     */
    pushTask_(task) {
      // If an explicit priority was provided, we use that. Otherwise if a
      // TaskSignal was provided, we get the priority from that. If neither a
      // priority or TaskSignal was provided, we default to 'user-visible'.
      var priority;
      if (task.options.priority) {
        priority = task.options.priority;
      } else if (task.options.signal && task.options.signal.priority) {
        priority = task.options.signal.priority;
      } else {
        priority = 'user-visible';
      }

      // The priority should have already been validated before calling this
      // method, but check the assumption and fail loudly if it doesn't hold.
      if (!SCHEDULER_PRIORITIES.includes(priority)) {
        throw new TypeError("Invalid task priority: " + priority);
      }

      // Subscribe to priority change events if this is the first time we're
      // learning about this signal.
      if (task.options.signal && task.options.signal.priority) {
        var signal = task.options.signal;
        if (!this.signals_.has(signal)) {
          signal.addEventListener('prioritychange', () => {
            this.onPriorityChange_(signal);
          });
          this.signals_.set(signal, signal.priority);
        }
      }
      this.queues_[priority][task.isContinuation ? 0 : 1].push(task);
    }

    /**
     * Run the oldest highest priority non-aborted task, if there is one.
     * @private
     */
    runNextTask_() {
      var task = null;

      // Aborted tasks aren't removed from the task queue, so we need to keep
      // looping until we find a non-aborted task. Alternatively, we should
      // consider just removing them from their queue.
      do {
        // TODO(shaseley): This can potentially run a background task in a
        // non-background task host callback.
        var {
          priority,
          type
        } = this.nextTaskPriority_();
        // No tasks to run.
        if (priority == null) return;

        // Note: `task` will only be null if the queue is empty, which should not
        // be the case if we found the priority of the next task to run.
        task = this.queues_[priority][type].takeNextTask();
      } while (task.isAborted());
      try {
        var result = task.callback();
        task.resolve(result);
      } catch (e) {
        task.reject(e);
      } finally {
        task.onTaskCompleted();
      }
    }

    /**
     * Get the priority and type of the next task or continuation to run.
     * @private
     * @return {{priority: ?string, type: number}} Returns the priority and type
     *    of the next continuation or task to run, or null if all queues are
     *    empty.
     */
    nextTaskPriority_() {
      for (var i = 0; i < SCHEDULER_PRIORITIES.length; i++) {
        var priority = SCHEDULER_PRIORITIES[i];
        for (var type = 0; type < 2; type++) {
          if (!this.queues_[priority][type].isEmpty()) return {
            priority,
            type
          };
        }
      }
      return {
        priority: null,
        type: 0
      };
    }
  }

  /**
   * Copyright 2020 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * Makes the controller's signal a TaskSignal by adding a read-only priority
   * property.
   * @private
   * @param {TaskController} controller
   */
  function makeTaskSignal(controller) {
    var signal = controller.signal;
    Object.defineProperties(signal, {
      priority: {
        get: function get() {
          return controller.priority_;
        },
        enumerable: true
      },
      onprioritychange: {
        value: null,
        writable: true,
        enumerable: true
      }
    });
    signal.addEventListener('prioritychange', e => {
      if (signal.onprioritychange) {
        signal.onprioritychange(e);
      }
    });
  }

  /**
   * Event type used for priority change events:
   * https://wicg.github.io/scheduling-apis/#sec-task-priority-change-event.
   */
  class TaskPriorityChangeEvent extends Event {
    /**
     * Constructs a TaskPriorityChangeEvent. Events of this type are typically
     * named 'prioritychange', which is the name used for events triggered by
     * TaskController.setPriority().
     *
     * @param {?string} typeArg
     * @param {{previousPriority: string}} init
     */
    constructor(typeArg, init) {
      if (!init || !SCHEDULER_PRIORITIES.includes(init.previousPriority)) {
        throw new TypeError("Invalid task priority: '" + init.previousPriority + "'");
      }
      super(typeArg);
      this.previousPriority = init.previousPriority;
    }
  }

  /**
   * TaskController enables changing the priority of tasks associated with its
   * TaskSignal.
   *
   * Unfortunately, we can't implement TaskSignal by extending AbortSignal because
   * we can't call its constructor. We can't implement a separate TaskSignal class
   * because we need the inheritance so that TaskSignals can be passed to other
   * APIs. We therefore modify the TaskController's underlying AbortSignal, adding
   * the priority property.
   */
  class TaskController extends AbortController {
    /**
     * @param {{priority: string}} init
     */
    constructor(init) {
      if (init === void 0) {
        init = {};
      }
      super();
      if (init == null) init = {};
      if (typeof init !== 'object') {
        throw new TypeError("'init' is not an object");
      }
      var priority = init.priority === undefined ? 'user-visible' : init.priority;
      if (!SCHEDULER_PRIORITIES.includes(priority)) {
        throw new TypeError("Invalid task priority: '" + priority + "'");
      }

      /**
       * @private
       * @type {string}
       */
      this.priority_ = priority;

      /**
       * @private
       * @type {boolean}
       */
      this.isPriorityChanging_ = false;
      makeTaskSignal(this);
    }

    /**
     * Change the priority of all tasks associated with this controller's signal.
     * @param {string} priority
     */
    setPriority(priority) {
      if (!SCHEDULER_PRIORITIES.includes(priority)) {
        throw new TypeError('Invalid task priority: ' + priority);
      }
      if (this.isPriorityChanging_) throw new DOMException('', 'NotAllowedError');
      if (this.signal.priority === priority) return;
      this.isPriorityChanging_ = true;
      var previousPriority = this.priority_;
      this.priority_ = priority;
      var e = new TaskPriorityChangeEvent('prioritychange', {
        previousPriority
      });
      this.signal.dispatchEvent(e);
      this.isPriorityChanging_ = false;
    }
  }

  /**
   * Copyright 2023 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */

  /**
   * @fileoverview This version of scheduler.yield() is only used if
   * self.scheduler is defined. It assumes that this is the native implementation
   * (i.e. running in an older browser), and it uses scheduler.postTask() to
   * schedule continuations at 'user-blocking' priority.
   */

  /**
   * Returns a promise that is resolved in a new task. This schedules
   * continuations as 'user-blocking' scheduler.postTask() tasks.
   *
   * @return {!Promise<*>}
   */
  function schedulerYield() {
    // Use 'user-blocking' priority to get similar scheduling behavior as
    // scheduler.yield(). Note: we can't reliably inherit priority and abort since
    // we lose context if async functions are spread across multiple tasks.
    return self.scheduler.postTask(() => {}, {
      priority: 'user-blocking'
    });
  }

  /**
   * Copyright 2021 Google LLC
   *
   * Licensed under the Apache License, Version 2.0 (the "License");
   * you may not use this file except in compliance with the License.
   * You may obtain a copy of the License at
   *
   *     https://www.apache.org/licenses/LICENSE-2.0
   *
   * Unless required by applicable law or agreed to in writing, software
   * distributed under the License is distributed on an "AS IS" BASIS,
   * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   * See the License for the specific language governing permissions and
   * limitations under the License.
   */
  if (typeof self.scheduler === 'undefined') {
    self.scheduler = new Scheduler();
    self.TaskController = TaskController;
    self.TaskPriorityChangeEvent = TaskPriorityChangeEvent;
  } else if (!self.scheduler.yield) {
    self.scheduler.yield = schedulerYield;
  }

})();
